-- Seed: Initial API keys for v1.2+
-- These are SHA-256 hashes of the original keys.
-- Computed with: echo -n "key" | shasum -a 256

-- First, clear old placeholder data
DELETE FROM api_keys;

-- Insert with correct hashes
INSERT INTO api_keys (id, key_hash, label, scopes, tenant_id) VALUES
  ('key_admin_001', 'cf3e13b64e6c1781b408f80ee06c2bd886767a9295bb1d9288a8011cc0457dbe', 'Admin Key', '["admin:read","admin:write","events:write"]', 'system'),
  ('key_producer_001', '5d6d3e49c14d3667ae3b178937157d8dcb2e6c7a6fc15394ea2b6a2d0076bdc8', 'Producer Key', '["events:write"]', 'demo-tenant'),
  ('key_dashboard_001', 'bdd3bd7ca014b3076610fd3eaa88a1682bd742982deecdd36ac6e0f20c3b87e0', 'Dashboard ROI Key', '["admin:read"]', 'system');
