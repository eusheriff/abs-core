import { DatabaseAdapter } from './db-adapter';

let instance: DatabaseAdapter;

export const setDB = (adapter: DatabaseAdapter) => {
    instance = adapter;
};

export const getDB = (): DatabaseAdapter => {
    if (!instance) {
        throw new Error('Database Adapter not initialized. Call setDB() first.');
    }
    return instance;
};

// Re-export specific queries logic
// Re-export specific queries logic
export const initSchema = async () => {
    const db = getDB();
    
    // 2. Events Store (Immutable "Source of Truth")
    await db.exec(`
      CREATE TABLE IF NOT EXISTS events_store (
        event_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        ingested_at TEXT NOT NULL,
        correlation_id TEXT,
        previous_hash TEXT,
        hash TEXT,
        signature TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_events_hash ON events_store(hash);
    `);

    // 3. Decision Log (Side-Effects / Audit)
    await db.exec(`
    CREATE TABLE IF NOT EXISTS decision_logs (
      decision_id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      correlation_id TEXT,
      timestamp TEXT NOT NULL,
      full_log_json TEXT NOT NULL,
      execution_status TEXT DEFAULT 'PENDING',
      execution_response TEXT,
      previous_hash TEXT,
      hash TEXT
    );
  `);
};

export const getRecentLogs = async (limit: number = 50) => {
    const db = getDB();
    return await db.all(`
        SELECT 
            decision_id,
            timestamp as created_at, 
            event_id as trace_id,
            'decision.proposed' as event_type,
            full_log_json as decision_payload,
            execution_status
        FROM decision_logs 
        ORDER BY timestamp DESC 
        LIMIT ?
    `, limit);
};
