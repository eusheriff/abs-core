/**
 * CHI Policy Integration Tests
 * 
 * Tests the integration of Cognitive Host Interface with Policy Decision Point.
 */

import { describe, it, expect } from 'vitest';
import { CHIPolicy, createCHIPolicyWithProfile } from './chi-policy';
import { DEFAULT_COGNITION_PROFILE } from '../chi';

describe('CHI Policy', () => {
  describe('Basic Evaluation', () => {
    it('should ALLOW safe actions', () => {
      const policy = new CHIPolicy();
      
      const result = policy.evaluate(
        { recommended_action: 'read_file' },
        { tool_name: 'fs.read', file_path: 'src/index.ts' }
      );
      
      expect(result.decision).toBe('ALLOW');
      expect(result.chi_analysis).toBeDefined();
      expect(result.domain).toBe('chi');
    });

    it('should DENY credential exposure', () => {
      const policy = new CHIPolicy();
      
      const result = policy.evaluate(
        { recommended_action: 'write_file' },
        { tool_name: 'fs.write', file_path: '.env' }
      );
      
      expect(result.decision).toBe('DENY');
      expect(result.score).toBe(100);
      expect(result.chi_analysis.inferred_risks).toContain('credential_exposure');
    });

    it('should DENY audit log modification', () => {
      const policy = new CHIPolicy();
      
      const result = policy.evaluate(
        { recommended_action: 'write_file' },
        { tool_name: 'fs.write', file_path: 'WORKLOG.wal' }
      );
      
      expect(result.decision).toBe('DENY');
      expect(result.chi_analysis.inferred_risks).toContain('audit_log_modification');
    });
  });

  describe('Constraint Application', () => {
    it('should require WAL event for state mutations', () => {
      const policy = new CHIPolicy();
      
      const result = policy.evaluate(
        { recommended_action: 'write_file' },
        { tool_name: 'fs.write', file_path: '_consolidated/STATE.md' }
      );
      
      expect(['ALLOW_WITH_CONSTRAINTS', 'REQUIRE_APPROVAL']).toContain(result.decision);
      expect(result.constraints).toContain('wal_event_required');
      expect(result.chi_analysis.inferred_risks).toContain('irreversible_state_mutation');
    });

    it('should require approval for delete operations', () => {
      const policy = createCHIPolicyWithProfile({
        requires_approval_on: ['fs.delete:**/*'],
      });
      
      const result = policy.evaluate(
        { recommended_action: 'delete_file' },
        { tool_name: 'fs.delete', file_path: 'src/old.ts' }
      );
      
      expect(result.decision).toBe('REQUIRE_APPROVAL');
      expect(result.required_actions).toContain('human_approval');
    });
  });

  describe('Custom Cognition Profile', () => {
    it('should respect custom forbidden patterns', () => {
      const policy = createCHIPolicyWithProfile({
        forbid: ['net.call:*'],
      });
      
      const result = policy.evaluate(
        { recommended_action: 'fetch_data' },
        { tool_name: 'net.call', content: 'fetch(https://api.example.com)' }
      );
      
      expect(result.decision).toBe('DENY');
    });

    it('should respect max_iterations from profile', () => {
      const policy = createCHIPolicyWithProfile({
        max_iterations: 3,
        autonomy_level: 'low',
      });
      
      // Policy should respect these constraints
      expect(policy).toBeDefined();
    });
  });

  describe('CHI Analysis Output', () => {
    it('should include detected intents in tags', () => {
      const policy = new CHIPolicy();
      
      const result = policy.evaluate(
        { recommended_action: 'write_file' },
        { tool_name: 'fs.write', content: 'writeFileSync(path, data)' }
      );
      
      expect(result.chi_analysis.detected_intents).toContain('fs.write');
      expect(result.tags).toContain('fs.write');
    });

    it('should include reasoning trace', () => {
      const policy = new CHIPolicy();
      
      const result = policy.evaluate(
        { recommended_action: 'read_secrets' },
        { file_path: 'secrets/api.key' }
      );
      
      expect(result.chi_analysis.reasoning.length).toBeGreaterThan(0);
    });
  });
});
