-- Migration: 0003_multi_tenant.sql
-- Description: Fix multi-tenant support and add audit query indices.
--
-- GAPS ADDRESSED:
-- 1. events_store missing tenant_id column
-- 2. decision_logs missing tenant_id column
-- 3. Missing composite indices for audit queries by tenant+time
-- 4. Missing index for decision_logs by timestamp

-- Add tenant_id to events_store
ALTER TABLE events_store ADD COLUMN tenant_id TEXT DEFAULT 'default';

-- Add tenant_id to decision_logs
ALTER TABLE decision_logs ADD COLUMN tenant_id TEXT DEFAULT 'default';

-- Index for multi-tenant queries on events
CREATE INDEX IF NOT EXISTS idx_events_tenant ON events_store(tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_tenant_time ON events_store(tenant_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_tenant_type ON events_store(tenant_id, type);

-- Index for multi-tenant audit queries on decisions
CREATE INDEX IF NOT EXISTS idx_decisions_tenant ON decision_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_decisions_tenant_time ON decision_logs(tenant_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_decisions_time ON decision_logs(timestamp);

-- Index for policy analysis
CREATE INDEX IF NOT EXISTS idx_decisions_policy ON decision_logs(policy_name);
CREATE INDEX IF NOT EXISTS idx_decisions_decision ON decision_logs(decision);
