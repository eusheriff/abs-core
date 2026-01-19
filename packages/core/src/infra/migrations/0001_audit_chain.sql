-- Migration: 0001_audit_chain.sql
-- Description: Add hash chaining columns for immutable audit trail verification.

ALTER TABLE events_store ADD COLUMN hash TEXT;
ALTER TABLE events_store ADD COLUMN previous_hash TEXT;
ALTER TABLE events_store ADD COLUMN signature TEXT;

ALTER TABLE decision_logs ADD COLUMN hash TEXT;
ALTER TABLE decision_logs ADD COLUMN previous_hash TEXT;

-- Index for traversal verification
CREATE INDEX IF NOT EXISTS idx_events_hash ON events_store(hash);
