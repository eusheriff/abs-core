import type Database from 'better-sqlite3';
import path from 'path';
import { DatabaseAdapter } from './db-adapter';

export class LocalDBAdapter implements DatabaseAdapter {
    private db: Database.Database | null = null;
    private dbPath: string;

    constructor(dbPath: string = 'abs_core.db') {
        this.dbPath = dbPath;
    }

    async init(): Promise<void> {
        if (this.db) return;
        const fullPath = path.resolve(process.cwd(), this.dbPath);
        console.log(`📦 Initializing Local DB at ${fullPath}`);
        
        // Lazy load to avoid crash if not needed (e.g. CLI client mode)
        const { default: DatabaseConstructor } = await import('better-sqlite3');
        this.db = new DatabaseConstructor(fullPath); // Sync instantiation

        // Schema Initialization (Same as SQLiteAdapter for consistency in tests)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS decision_logs (
                decision_id TEXT PRIMARY KEY,
                tenant_id TEXT,
                event_id TEXT,
                policy_name TEXT,
                provider TEXT,
                decision TEXT,
                risk_score INTEGER DEFAULT 0,
                execution_status TEXT DEFAULT 'pending',
                execution_response TEXT,
                full_log_json TEXT,
                timestamp TEXT,
                signature TEXT,
                latency_ms INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS pending_reviews (
                review_id TEXT PRIMARY KEY,
                event_id TEXT,
                tenant_id TEXT,
                decision_id TEXT,
                status TEXT DEFAULT 'pending',
                escalation_reason TEXT,
                created_at TEXT
            );
        `);
        
        return Promise.resolve();
    }

    async exec(query: string): Promise<void> {
        if (!this.db) await this.init();
        this.db!.exec(query);
    }

    async run(query: string, ...params: any[]): Promise<{ isSuccess: boolean }> {
        if (!this.db) await this.init();
        try {
            this.db!.prepare(query).run(...params);
            return { isSuccess: true };
        } catch (e: any) {
            console.error('DB Run Error:', e);
            throw e;
        }
    }

    async all<T = any>(query: string, ...params: any[]): Promise<T[]> {
        if (!this.db) await this.init();
        return this.db!.prepare(query).all(...params) as T[];
    }
}
