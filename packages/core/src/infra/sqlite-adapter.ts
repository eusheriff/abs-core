import Database from 'better-sqlite3';
import { DatabaseAdapter } from './db-adapter';
import { readFileSync } from 'fs';
import { join } from 'path';

export class SQLiteAdapter implements DatabaseAdapter {
    private db: Database.Database;

    constructor(dbPath: string = ':memory:') {
        this.db = new Database(dbPath);
    }

    async exec(query: string): Promise<void> {
        this.db.exec(query);
    }

    async run(query: string, ...params: any[]): Promise<{ isSuccess: boolean }> {
        // Migration Hack: Check if risk_score exists if inserting into decision_logs
        if (query.includes('INSERT INTO decision_logs') && !query.includes('risk_score')) {
             // In a real migration we'd alter table. For local dev/POC, we can just ensure
             // we are passing the right number of params if the query changes content.
             // But here we are just running the SQL passed by processor.
        }
        
        try {
            const stmt = this.db.prepare(query);
            const info = stmt.run(...params);
            return { isSuccess: info.changes > 0 };
        } catch (error) {
            // console.error('[SQLite] Run Error:', error); // Verbose
            throw error;
        }
    }

    async all<T = any>(query: string, ...params: any[]): Promise<T[]> {
        return this.db.prepare(query).all(...params) as T[];
    }

    async init(): Promise<void> {
        // Load schema from migrations
        try {
            const schemaPath = join(__dirname, 'migrations', '001_initial.sql');
            const schema = readFileSync(schemaPath, 'utf-8');
            this.db.exec(schema);
        } catch (e) {
            // Fallback: create minimal schema inline
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
        }
    }
    
    // Alias for compatibility
    async initialize(): Promise<void> {
        return this.init();
    }

    // Helper for testing
    close(): void {
        this.db.close();
    }
}
