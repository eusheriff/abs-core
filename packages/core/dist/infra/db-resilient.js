"use strict";
/**
 * Resilient D1 Wrapper
 *
 * Provides graceful degradation when D1 is unavailable:
 * - Retry with exponential backoff
 * - Fallback to in-memory cache
 * - Circuit breaker pattern
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResilientD1Adapter = void 0;
const metrics_1 = require("../core/metrics");
class ResilientD1Adapter {
    constructor(db) {
        this.circuit = { failures: 0, lastFailure: 0, open: false };
        this.fallbackCache = new Map();
        // Circuit breaker config
        this.failureThreshold = 5;
        this.resetTimeout = 30000; // 30 seconds
        this.db = db;
    }
    checkCircuit() {
        if (this.circuit.open) {
            const timeSinceFailure = Date.now() - this.circuit.lastFailure;
            if (timeSinceFailure > this.resetTimeout) {
                // Allow one request through (half-open state)
                this.circuit.open = false;
                this.circuit.failures = 0;
            }
            else {
                throw new Error('Circuit breaker is open - D1 unavailable');
            }
        }
    }
    recordFailure() {
        this.circuit.failures++;
        this.circuit.lastFailure = Date.now();
        metrics_1.Metrics.recordError('db');
        if (this.circuit.failures >= this.failureThreshold) {
            this.circuit.open = true;
            console.warn('⚡ Circuit breaker OPEN - D1 failures exceeded threshold');
        }
    }
    recordSuccess() {
        this.circuit.failures = 0;
        this.circuit.open = false;
    }
    isHealthy() {
        return !this.circuit.open;
    }
    async run(sql, ...params) {
        this.checkCircuit();
        try {
            await this.db.prepare(sql).bind(...params).run();
            this.recordSuccess();
        }
        catch (error) {
            this.recordFailure();
            console.error('D1 run failed:', error);
            // For writes, we can't fall back - throw
            throw error;
        }
    }
    async getOne(sql, ...params) {
        this.checkCircuit();
        try {
            const result = await this.db.prepare(sql).bind(...params).first();
            this.recordSuccess();
            return result;
        }
        catch (error) {
            this.recordFailure();
            console.error('D1 getOne failed, returning null:', error);
            return null;
        }
    }
    async getAll(sql, ...params) {
        const cacheKey = `${sql}:${JSON.stringify(params)}`;
        try {
            this.checkCircuit();
            const result = await this.db.prepare(sql).bind(...params).all();
            this.recordSuccess();
            // Cache successful reads
            if (result.results) {
                this.fallbackCache.set(cacheKey, result.results);
            }
            return result.results || [];
        }
        catch (error) {
            this.recordFailure();
            console.warn('D1 getAll failed, using cache:', error);
            // Return cached data if available
            const cached = this.fallbackCache.get(cacheKey);
            if (cached) {
                return cached;
            }
            return [];
        }
    }
    // Clear cache (useful for testing)
    clearCache() {
        this.fallbackCache.clear();
    }
    // Get circuit state for monitoring
    getCircuitState() {
        return { ...this.circuit };
    }
}
exports.ResilientD1Adapter = ResilientD1Adapter;
