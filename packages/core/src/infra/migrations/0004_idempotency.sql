-- Migration: 0004_idempotency.sql
-- Description: Enforce 1:1 relationship between event and decision to guarantee idempotency.

CREATE UNIQUE INDEX IF NOT EXISTS idx_decision_logs_event_unique ON decision_logs(event_id);
