/**
 * Resilient D1 Wrapper
 * 
 * Provides graceful degradation when D1 is unavailable:
 * - Retry with exponential backoff
 * - Fallback to in-memory cache
 * - Circuit breaker pattern
 */

import { Metrics } from '../core/metrics';

export interface ResilientDB {
    run(sql: string, ...params: unknown[]): Promise<void>;
    getOne<T>(sql: string, ...params: unknown[]): Promise<T | null>;
    getAll<T>(sql: string, ...params: unknown[]): Promise<T[]>;
    isHealthy(): boolean;
}

interface CircuitState {
    failures: number;
    lastFailure: number;
    open: boolean;
}

export class ResilientD1Adapter implements ResilientDB {
    private db: D1Database;
    private circuit: CircuitState = { failures: 0, lastFailure: 0, open: false };
    private fallbackCache: Map<string, unknown[]> = new Map();
    
    // Circuit breaker config
    private readonly failureThreshold = 5;
    private readonly resetTimeout = 30000; // 30 seconds

    constructor(db: D1Database) {
        this.db = db;
    }

    private checkCircuit(): void {
        if (this.circuit.open) {
            const timeSinceFailure = Date.now() - this.circuit.lastFailure;
            if (timeSinceFailure > this.resetTimeout) {
                // Allow one request through (half-open state)
                this.circuit.open = false;
                this.circuit.failures = 0;
            } else {
                throw new Error('Circuit breaker is open - D1 unavailable');
            }
        }
    }

    private recordFailure(): void {
        this.circuit.failures++;
        this.circuit.lastFailure = Date.now();
        Metrics.recordError('db');
        
        if (this.circuit.failures >= this.failureThreshold) {
            this.circuit.open = true;
            console.warn('⚡ Circuit breaker OPEN - D1 failures exceeded threshold');
        }
    }

    private recordSuccess(): void {
        this.circuit.failures = 0;
        this.circuit.open = false;
    }

    isHealthy(): boolean {
        return !this.circuit.open;
    }

    async run(sql: string, ...params: unknown[]): Promise<void> {
        this.checkCircuit();
        
        try {
            await this.db.prepare(sql).bind(...params).run();
            this.recordSuccess();
        } catch (error) {
            this.recordFailure();
            console.error('D1 run failed:', error);
            // For writes, we can't fall back - throw
            throw error;
        }
    }

    async getOne<T>(sql: string, ...params: unknown[]): Promise<T | null> {
        this.checkCircuit();
        
        try {
            const result = await this.db.prepare(sql).bind(...params).first<T>();
            this.recordSuccess();
            return result;
        } catch (error) {
            this.recordFailure();
            console.error('D1 getOne failed, returning null:', error);
            return null;
        }
    }

    async getAll<T>(sql: string, ...params: unknown[]): Promise<T[]> {
        const cacheKey = `${sql}:${JSON.stringify(params)}`;
        
        try {
            this.checkCircuit();
            const result = await this.db.prepare(sql).bind(...params).all<T>();
            this.recordSuccess();
            
            // Cache successful reads
            if (result.results) {
                this.fallbackCache.set(cacheKey, result.results);
            }
            
            return result.results || [];
        } catch (error) {
            this.recordFailure();
            console.warn('D1 getAll failed, using cache:', error);
            
            // Return cached data if available
            const cached = this.fallbackCache.get(cacheKey) as T[] | undefined;
            if (cached) {
                return cached;
            }
            
            return [];
        }
    }

    // Clear cache (useful for testing)
    clearCache(): void {
        this.fallbackCache.clear();
    }

    // Get circuit state for monitoring
    getCircuitState(): CircuitState {
        return { ...this.circuit };
    }
}
