-- Migration: 0000_init.sql
-- Description: Initial schema for ABS Core (Event Sourcing + Decision Logs)

CREATE TABLE IF NOT EXISTS events_store (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  source TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending' -- pending, processed, failed
);

CREATE TABLE IF NOT EXISTS decision_logs (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  policy_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  decision TEXT NOT NULL, -- ALLOW, DENY, ESCALATE
  reason TEXT,
  metadata TEXT, -- JSON string
  latency_ms INTEGER,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(event_id) REFERENCES events_store(id)
);

CREATE INDEX IF NOT EXISTS idx_events_type ON events_store(type);
CREATE INDEX IF NOT EXISTS idx_decisions_event ON decision_logs(event_id);
