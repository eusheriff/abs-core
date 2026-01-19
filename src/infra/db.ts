import Database from 'better-sqlite3';
import path from 'path';

// Singleton DB instance
let db: Database.Database;

export const initDB = (dbPath: string = 'abs_core.db') => {
  if (db) return db;
  
  const fullPath = path.resolve(process.cwd(), dbPath);
  db = new Database(fullPath, { verbose: console.log });
  
  // Initialize Schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS decision_logs (
      decision_id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      correlation_id TEXT,
      timestamp TEXT NOT NULL,
      full_log_json TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS process_instances (
      process_id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      current_state TEXT NOT NULL,
      context_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Migration v0.5: Add execution columns if not exist
  try {
    db.exec(`ALTER TABLE decision_logs ADD COLUMN execution_status TEXT DEFAULT 'PENDING'`);
    db.exec(`ALTER TABLE decision_logs ADD COLUMN execution_response TEXT`);
    console.log('📦 Schema migrated: Added execution columns');
  } catch (e) {
    // Columns likely exist, ignore
  }

  console.log(`📦 Database initialized at ${fullPath}`);
  return db;
};

export const getDB = () => {
    if (!db) initDB();
    return db;
};

export const getRecentLogs = (limit: number = 50) => {
    const database = getDB();
    const stmt = database.prepare(`
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
    `);
    // Mapping to match dashboard expected format
    return stmt.all(limit);
};
