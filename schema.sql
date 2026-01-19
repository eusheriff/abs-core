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
