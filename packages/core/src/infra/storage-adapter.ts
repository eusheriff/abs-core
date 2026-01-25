/**
 * Storage Adapter Interface
 * 
 * Abstracts D1 (Cloudflare) vs PostgreSQL vs SQLite.
 * Documents capacity limits per implementation.
 * 
 * Design Goals:
 * - Append-only for audit logs (immutability)
 * - Capacity awareness for planning
 * - Migration path to horizontal scaling
 */

/// <reference types="@cloudflare/workers-types" />

export interface QueryCondition {
  field: string;
  operator: '=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN';
  value: unknown;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface StorageCapacity {
  /** Bytes currently used */
  usedBytes: number;
  /** Maximum bytes allowed (per limit) */
  maxBytes: number;
  /** Rows currently stored */
  usedRows: number;
  /** Maximum rows (null = unlimited) */
  maxRows: number | null;
  /** Percentage of capacity used */
  usagePercent: number;
}

export interface InsertResult {
  id: string;
  success: boolean;
}

export interface StorageAdapter {
  /** Adapter name for logging */
  readonly name: string;
  
  /** Is this storage append-only (immutable audit logs)? */
  readonly appendOnly: boolean;
  
  /**
   * Insert a record
   * For append-only storage, this is the primary write operation
   */
  insert<T extends Record<string, unknown>>(
    table: string, 
    data: T
  ): Promise<InsertResult>;
  
  /**
   * Get a single record by ID
   */
  get<T>(table: string, id: string): Promise<T | null>;
  
  /**
   * Query records with conditions
   */
  query<T>(
    table: string, 
    conditions: QueryCondition[],
    options?: QueryOptions
  ): Promise<T[]>;
  
  /**
   * Count records matching conditions
   */
  count(table: string, conditions?: QueryCondition[]): Promise<number>;
  
  /**
   * Get current storage capacity
   * Used for capacity planning and alerts
   */
  getCapacity(): Promise<StorageCapacity>;
  
  /**
   * Health check
   */
  healthCheck(): Promise<{ healthy: boolean; latencyMs: number; error?: string }>;
}

/**
 * D1 Storage Adapter (Cloudflare)
 * 
 * Limits (documented):
 * - Max DB size: 10 GB (10,737,418,240 bytes)
 * - Single Durable Object per DB (no horizontal scaling)
 * - Free plan: 5M row reads/day, 100K writes/day
 * - Pro plan: 50B row reads/month
 * - Workers paid: Included
 * 
 * Reference: https://developers.cloudflare.com/d1/platform/limits/
 */
export class D1StorageAdapter implements StorageAdapter {
  readonly name = 'D1';
  readonly appendOnly = true;
  
  private static readonly MAX_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB
  
  constructor(private db: D1Database) {}
  
  async getCapacity(): Promise<StorageCapacity> {
    try {
      // Query SQLite internal table for size estimation
      const result = await this.db.prepare(
        `SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()`
      ).first<{ size: number }>();
      
      const rowCount = await this.db.prepare(
        `SELECT SUM(cnt) as total FROM (
          SELECT COUNT(*) as cnt FROM decision_logs
          UNION ALL
          SELECT COUNT(*) as cnt FROM events_store
        )`
      ).first<{ total: number }>();
      
      const usedBytes = result?.size || 0;
      const usedRows = rowCount?.total || 0;
      
      return {
        usedBytes,
        maxBytes: D1StorageAdapter.MAX_BYTES,
        usedRows,
        maxRows: null, // No hard row limit
        usagePercent: (usedBytes / D1StorageAdapter.MAX_BYTES) * 100
      };
    } catch {
      return {
        usedBytes: 0,
        maxBytes: D1StorageAdapter.MAX_BYTES,
        usedRows: 0,
        maxRows: null,
        usagePercent: 0
      };
    }
  }
  
  async insert<T extends Record<string, unknown>>(
    table: string, 
    data: T
  ): Promise<InsertResult> {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.sanitizeIdentifier(table)} (${keys.map(k => this.sanitizeIdentifier(k)).join(', ')}) VALUES (${placeholders})`;
    
    try {
      await this.db.prepare(sql).bind(...Object.values(data)).run();
      
      // Get last inserted ID
      const lastId = await this.db.prepare('SELECT last_insert_rowid() as id').first<{ id: number }>();
      
      return { 
        id: (data['id'] as string) || String(lastId?.id || ''),
        success: true 
      };
    } catch (error) {
      console.error('[D1StorageAdapter] Insert failed:', error);
      return { id: '', success: false };
    }
  }
  
  async get<T>(table: string, id: string): Promise<T | null> {
    const sql = `SELECT * FROM ${this.sanitizeIdentifier(table)} WHERE id = ?`;
    return this.db.prepare(sql).bind(id).first<T>();
  }
  
  async query<T>(
    table: string,
    conditions: QueryCondition[],
    options?: QueryOptions
  ): Promise<T[]> {
    let sql = `SELECT * FROM ${this.sanitizeIdentifier(table)}`;
    const params: unknown[] = [];
    
    if (conditions.length > 0) {
      const whereClauses = conditions.map(c => {
        if (c.operator === 'IN' && Array.isArray(c.value)) {
          const placeholders = c.value.map(() => '?').join(', ');
          params.push(...c.value);
          return `${this.sanitizeIdentifier(c.field)} IN (${placeholders})`;
        }
        params.push(c.value);
        return `${this.sanitizeIdentifier(c.field)} ${c.operator} ?`;
      });
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    
    if (options?.orderBy) {
      sql += ` ORDER BY ${this.sanitizeIdentifier(options.orderBy)} ${options.orderDirection || 'ASC'}`;
    }
    if (options?.limit) {
      sql += ` LIMIT ${Number(options.limit)}`;
    }
    if (options?.offset) {
      sql += ` OFFSET ${Number(options.offset)}`;
    }
    
    const result = await this.db.prepare(sql).bind(...params).all<T>();
    return result.results ?? [];
  }
  
  async count(table: string, conditions?: QueryCondition[]): Promise<number> {
    let sql = `SELECT COUNT(*) as cnt FROM ${this.sanitizeIdentifier(table)}`;
    const params: unknown[] = [];
    
    if (conditions && conditions.length > 0) {
      const whereClauses = conditions.map(c => {
        params.push(c.value);
        return `${this.sanitizeIdentifier(c.field)} ${c.operator} ?`;
      });
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    
    const result = await this.db.prepare(sql).bind(...params).first<{ cnt: number }>();
    return result?.cnt || 0;
  }
  
  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
    const start = performance.now();
    try {
      await this.db.prepare('SELECT 1').first();
      return { healthy: true, latencyMs: performance.now() - start };
    } catch (error) {
      return { 
        healthy: false, 
        latencyMs: performance.now() - start,
        error: String(error)
      };
    }
  }
  
  private sanitizeIdentifier(name: string): string {
    // Prevent SQL injection in identifiers
    return name.replace(/[^a-zA-Z0-9_]/g, '');
  }
}

/**
 * SQLite Storage Adapter (Local Development / Testing)
 * 
 * Uses better-sqlite3 for synchronous operations.
 * Useful for local dev and unit tests.
 */
export class SQLiteStorageAdapter implements StorageAdapter {
  readonly name = 'SQLite';
  readonly appendOnly = true;
  
  constructor(private db: import('better-sqlite3').Database) {}
  
  async getCapacity(): Promise<StorageCapacity> {
    try {
      const pageCount = this.db.pragma('page_count', { simple: true }) as number;
      const pageSize = this.db.pragma('page_size', { simple: true }) as number;
      const usedBytes = pageCount * pageSize;
      
      return {
        usedBytes,
        maxBytes: Number.MAX_SAFE_INTEGER, // SQLite has no practical limit
        usedRows: 0,
        maxRows: null,
        usagePercent: 0
      };
    } catch {
      return {
        usedBytes: 0,
        maxBytes: Number.MAX_SAFE_INTEGER,
        usedRows: 0,
        maxRows: null,
        usagePercent: 0
      };
    }
  }
  
  async insert<T extends Record<string, unknown>>(
    table: string, 
    data: T
  ): Promise<InsertResult> {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    
    try {
      const result = this.db.prepare(sql).run(...Object.values(data));
      return { 
        id: (data['id'] as string) || String(result.lastInsertRowid),
        success: true 
      };
    } catch (error) {
      console.error('[SQLiteStorageAdapter] Insert failed:', error);
      return { id: '', success: false };
    }
  }
  
  async get<T>(table: string, id: string): Promise<T | null> {
    const sql = `SELECT * FROM ${table} WHERE id = ?`;
    return this.db.prepare(sql).get(id) as T | null;
  }
  
  async query<T>(
    table: string,
    conditions: QueryCondition[],
    options?: QueryOptions
  ): Promise<T[]> {
    let sql = `SELECT * FROM ${table}`;
    const params: unknown[] = [];
    
    if (conditions.length > 0) {
      const whereClauses = conditions.map(c => {
        params.push(c.value);
        return `${c.field} ${c.operator} ?`;
      });
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    
    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDirection || 'ASC'}`;
    }
    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`;
    }
    if (options?.offset) {
      sql += ` OFFSET ${options.offset}`;
    }
    
    return this.db.prepare(sql).all(...params) as T[];
  }
  
  async count(table: string, conditions?: QueryCondition[]): Promise<number> {
    let sql = `SELECT COUNT(*) as cnt FROM ${table}`;
    const params: unknown[] = [];
    
    if (conditions && conditions.length > 0) {
      const whereClauses = conditions.map(c => {
        params.push(c.value);
        return `${c.field} ${c.operator} ?`;
      });
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    
    const result = this.db.prepare(sql).get(...params) as { cnt: number };
    return result?.cnt || 0;
  }
  
  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
    const start = performance.now();
    try {
      this.db.prepare('SELECT 1').get();
      return { healthy: true, latencyMs: performance.now() - start };
    } catch (error) {
      return { 
        healthy: false, 
        latencyMs: performance.now() - start,
        error: String(error)
      };
    }
  }
}
