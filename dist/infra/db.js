"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentLogs = exports.initSchema = exports.getDB = exports.setDB = void 0;
let instance;
const setDB = (adapter) => {
    instance = adapter;
};
exports.setDB = setDB;
const getDB = () => {
    if (!instance) {
        throw new Error('Database Adapter not initialized. Call setDB() first.');
    }
    return instance;
};
exports.getDB = getDB;
// Re-export specific queries logic
const initSchema = async () => {
    const db = (0, exports.getDB)();
    await db.exec(`
    CREATE TABLE IF NOT EXISTS decision_logs (
      decision_id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      correlation_id TEXT,
      timestamp TEXT NOT NULL,
      full_log_json TEXT NOT NULL,
      execution_status TEXT DEFAULT 'PENDING',
      execution_response TEXT
    );
  `);
};
exports.initSchema = initSchema;
const getRecentLogs = async (limit = 50) => {
    const db = (0, exports.getDB)();
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
exports.getRecentLogs = getRecentLogs;
