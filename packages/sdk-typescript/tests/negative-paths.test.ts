/**
 * @abs/sdk-typescript - Negative Path Tests
 * 
 * Tests failure modes: expired, monitor mode, gate failures, clock skew
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ABSClient,
  DecisionEnvelopeBuilder,
  ExecutionReceiptBuilder,
  guardExecutable,
  guardNotExpired,
  guardNotMonitorMode,
  guardAllowed,
  guardGatesPassed,
  guardTimeSync,
  validateChain,
  timeProvider,
  ABSExpiredError,
  ABSMonitorModeError,
  ABSVerdictError,
  ABSGateError,
  ABSClockSkewError,
} from '../src';

describe('Negative Paths: Failure Modes', () => {
  beforeEach(() => {
    timeProvider.setMockTime(null);
  });

  describe('Expired Decisions', () => {
    it('should throw ABSExpiredError for expired valid_until', () => {
      const pastTime = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
      
      const envelope = new DecisionEnvelopeBuilder()
        .setDecisionId('550e8400-e29b-41d4-a716-446655440010')
        .setTraceId('trace-exp-1')
        .setVerdict('ALLOW')
        .setReasonCode('POLICY.VIOLATION')
        .setReasonHuman('Approved')
        .setRiskScore(10)
        .setAuthority({
          policy_name: 'test-policy',
          policy_version: '1.0.0',
          evaluated_at: new Date().toISOString(),
        })
        .setContext({
          tenant_id: 't1',
          agent_id: 'a1',
          event_type: 'test',
          action_requested: 'test',
        })
        .setValidUntil(pastTime)
        .buildUnsafe(); // Use unsafe to skip validation

      expect(() => guardNotExpired(envelope)).toThrow(ABSExpiredError);
      expect(() => guardExecutable(envelope)).toThrow(ABSExpiredError);
    });

    it('should block execution for expired envelope', async () => {
      const client = new ABSClient({
        tenantId: 't1',
        agentId: 'a1',
      });

      const pastTime = new Date(Date.now() - 60000).toISOString();
      
      const envelope = new DecisionEnvelopeBuilder()
        .setDecisionId('550e8400-e29b-41d4-a716-446655440011')
        .setTraceId('trace-exp-2')
        .setVerdict('ALLOW')
        .setReasonCode('POLICY.VIOLATION')
        .setReasonHuman('Approved')
        .setRiskScore(10)
        .setAuthority({
          policy_name: 'test-policy',
          policy_version: '1.0.0',
          evaluated_at: new Date().toISOString(),
        })
        .setContext({
          tenant_id: 't1',
          agent_id: 'a1',
          event_type: 'test',
          action_requested: 'test',
        })
        .setValidUntil(pastTime)
        .buildUnsafe();

      const result = await client.execute(envelope, async () => {
        return { data: 'should not execute' };
      });

      expect(result.status).toBe('blocked');
      expect(result.receipt.outcome).toBe('BLOCKED');
      expect(result.error).toBeInstanceOf(ABSExpiredError);
    });
  });

  describe('Monitor Mode', () => {
    it('should throw ABSMonitorModeError for monitor_mode=true', () => {
      const envelope = new DecisionEnvelopeBuilder()
        .setDecisionId('550e8400-e29b-41d4-a716-446655440020')
        .setTraceId('trace-mon-1')
        .setVerdict('ALLOW')
        .setReasonCode('POLICY.VIOLATION')
        .setReasonHuman('Approved')
        .setRiskScore(10)
        .setAuthority({
          policy_name: 'test-policy',
          policy_version: '1.0.0',
          evaluated_at: new Date().toISOString(),
        })
        .setContext({
          tenant_id: 't1',
          agent_id: 'a1',
          event_type: 'test',
          action_requested: 'test',
        })
        .setMonitorMode(true)
        .build();

      expect(() => guardNotMonitorMode(envelope)).toThrow(ABSMonitorModeError);
      expect(() => guardExecutable(envelope)).toThrow(ABSMonitorModeError);
    });
  });

  describe('Verdict Errors', () => {
    it('should throw ABSVerdictError for DENY verdict', () => {
      const envelope = new DecisionEnvelopeBuilder()
        .setDecisionId('550e8400-e29b-41d4-a716-446655440030')
        .setTraceId('trace-deny-1')
        .setVerdict('DENY')
        .setReasonCode('POLICY.VIOLATION')
        .setReasonHuman('Denied by policy')
        .setRiskScore(90)
        .setAuthority({
          policy_name: 'test-policy',
          policy_version: '1.0.0',
          evaluated_at: new Date().toISOString(),
        })
        .setContext({
          tenant_id: 't1',
          agent_id: 'a1',
          event_type: 'test',
          action_requested: 'test',
        })
        .build();

      expect(() => guardAllowed(envelope)).toThrow(ABSVerdictError);
    });

    it('should throw ABSVerdictError for REQUIRE_APPROVAL verdict', () => {
      const envelope = new DecisionEnvelopeBuilder()
        .setDecisionId('550e8400-e29b-41d4-a716-446655440031')
        .setTraceId('trace-approve-1')
        .setVerdict('REQUIRE_APPROVAL')
        .setReasonCode('RISK.EXCEEDED')
        .setReasonHuman('Requires human approval')
        .setRiskScore(75)
        .setAuthority({
          policy_name: 'test-policy',
          policy_version: '1.0.0',
          evaluated_at: new Date().toISOString(),
        })
        .setContext({
          tenant_id: 't1',
          agent_id: 'a1',
          event_type: 'test',
          action_requested: 'test',
        })
        .build();

      expect(() => guardAllowed(envelope)).toThrow(ABSVerdictError);
    });
  });

  describe('Gate Failures', () => {
    it('should throw ABSGateError for FAIL gate', () => {
      const envelope = new DecisionEnvelopeBuilder()
        .setDecisionId('550e8400-e29b-41d4-a716-446655440040')
        .setTraceId('trace-gate-1')
        .setVerdict('ALLOW')
        .setReasonCode('POLICY.VIOLATION')
        .setReasonHuman('Approved')
        .setRiskScore(10)
        .setAuthority({
          policy_name: 'test-policy',
          policy_version: '1.0.0',
          evaluated_at: new Date().toISOString(),
        })
        .setContext({
          tenant_id: 't1',
          agent_id: 'a1',
          event_type: 'test',
          action_requested: 'test',
        })
        .build();

      const receipt = new ExecutionReceiptBuilder(envelope)
        .setExecutorId('executor-1')
        .setExecutionContext({ environment: 'test', tenant_id: 't1' })
        .addGateFail('TENANT_ACTIVE', 'policy-service')
        .setOutcome('BLOCKED')
        .buildUnsafe();

      expect(() => guardGatesPassed(receipt)).toThrow(ABSGateError);
    });

    it('should throw ABSGateError for unauthorized SKIPPED gate', () => {
      const envelope = new DecisionEnvelopeBuilder()
        .setDecisionId('550e8400-e29b-41d4-a716-446655440041')
        .setTraceId('trace-gate-2')
        .setVerdict('ALLOW')
        .setReasonCode('POLICY.VIOLATION')
        .setReasonHuman('Approved')
        .setRiskScore(10)
        .setAuthority({
          policy_name: 'test-policy',
          policy_version: '1.0.0',
          evaluated_at: new Date().toISOString(),
        })
        .setContext({
          tenant_id: 't1',
          agent_id: 'a1',
          event_type: 'test',
          action_requested: 'test',
        })
        .build();

      // Manually create receipt with unauthorized SKIPPED (without policy version)
      const receipt = new ExecutionReceiptBuilder(envelope)
        .setExecutorId('executor-1')
        .setExecutionContext({ environment: 'test', tenant_id: 't1' })
        .setGate('TENANT_ACTIVE', {
          result: 'SKIPPED',
          checked_at: new Date().toISOString(),
          source: 'manual',
          // Missing skip_policy_version = unauthorized
        })
        .setOutcome('EXECUTED')
        .buildUnsafe();

      expect(() => guardGatesPassed(receipt)).toThrow(ABSGateError);
    });

    it('should allow authorized SKIPPED gate', () => {
      const envelope = new DecisionEnvelopeBuilder()
        .setDecisionId('550e8400-e29b-41d4-a716-446655440042')
        .setTraceId('trace-gate-3')
        .setVerdict('ALLOW')
        .setReasonCode('POLICY.VIOLATION')
        .setReasonHuman('Approved')
        .setRiskScore(10)
        .setAuthority({
          policy_name: 'test-policy',
          policy_version: '1.0.0',
          evaluated_at: new Date().toISOString(),
        })
        .setContext({
          tenant_id: 't1',
          agent_id: 'a1',
          event_type: 'test',
          action_requested: 'test',
        })
        .build();

      const receipt = new ExecutionReceiptBuilder(envelope)
        .setExecutorId('executor-1')
        .setExecutionContext({ environment: 'test', tenant_id: 't1' })
        .addGateSkipped('TENANT_ACTIVE', 'admin', {
          iKnowWhatImDoing: true,
          policyVersion: 'emergency-override-1.0',
          reason: 'Emergency maintenance window',
        })
        .setOutcome('EXECUTED')
        .build();

      // Should NOT throw - authorized skip
      expect(() => guardGatesPassed(receipt)).not.toThrow();
    });
  });

  describe('Clock Skew', () => {
    it('should throw ABSClockSkewError for excessive skew', () => {
      const farFuture = new Date(Date.now() + 3600000).toISOString(); // 1 hour ahead
      
      expect(() => guardTimeSync(farFuture, 30000)).toThrow(ABSClockSkewError);
    });

    it('should pass for acceptable skew', () => {
      const slightlyOff = new Date(Date.now() - 5000).toISOString(); // 5 seconds ago
      
      expect(() => guardTimeSync(slightlyOff, 30000)).not.toThrow();
    });
  });

  describe('Chain Validation', () => {
    it('should fail chain validation when decision_id mismatch', () => {
      const envelope = new DecisionEnvelopeBuilder()
        .setDecisionId('550e8400-e29b-41d4-a716-446655440050')
        .setTraceId('trace-chain-1')
        .setVerdict('ALLOW')
        .setReasonCode('POLICY.VIOLATION')
        .setReasonHuman('Approved')
        .setRiskScore(10)
        .setAuthority({
          policy_name: 'test-policy',
          policy_version: '1.0.0',
          evaluated_at: new Date().toISOString(),
        })
        .setContext({
          tenant_id: 't1',
          agent_id: 'a1',
          event_type: 'test',
          action_requested: 'test',
        })
        .build();

      // Create receipt with DIFFERENT decision_id
      const otherEnvelope = new DecisionEnvelopeBuilder()
        .setDecisionId('550e8400-e29b-41d4-a716-446655440099') // Different!
        .setTraceId('trace-other')
        .setVerdict('ALLOW')
        .setReasonCode('POLICY.VIOLATION')
        .setReasonHuman('Other')
        .setRiskScore(10)
        .setAuthority({
          policy_name: 'test-policy',
          policy_version: '1.0.0',
          evaluated_at: new Date().toISOString(),
        })
        .setContext({
          tenant_id: 't1',
          agent_id: 'a1',
          event_type: 'test',
          action_requested: 'test',
        })
        .build();

      const receipt = new ExecutionReceiptBuilder(otherEnvelope)
        .setExecutorId('executor-1')
        .setExecutionContext({ environment: 'test', tenant_id: 't1' })
        .setOutcome('EXECUTED')
        .build();

      const result = validateChain(envelope, [receipt]);
      
      expect(result.valid).toBe(false);
      expect(result.breakPoint?.reason).toBe('Decision ID mismatch');
    });

    it('should fail chain validation when required gate missing', () => {
      const envelope = new DecisionEnvelopeBuilder()
        .setDecisionId('550e8400-e29b-41d4-a716-446655440051')
        .setTraceId('trace-chain-2')
        .setVerdict('ALLOW')
        .setReasonCode('POLICY.VIOLATION')
        .setReasonHuman('Approved')
        .setRiskScore(10)
        .setAuthority({
          policy_name: 'test-policy',
          policy_version: '1.0.0',
          evaluated_at: new Date().toISOString(),
        })
        .setContext({
          tenant_id: 't1',
          agent_id: 'a1',
          event_type: 'test',
          action_requested: 'test',
        })
        .setRequiredChecks(['TENANT_ACTIVE', 'NO_INCIDENT'])
        .build();

      // Receipt only checks TENANT_ACTIVE, missing NO_INCIDENT
      const receipt = new ExecutionReceiptBuilder(envelope)
        .setExecutorId('executor-1')
        .setExecutionContext({ environment: 'test', tenant_id: 't1' })
        .addGatePass('TENANT_ACTIVE', 'policy-service')
        // Missing NO_INCIDENT!
        .setOutcome('EXECUTED')
        .buildUnsafe();

      const result = validateChain(envelope, [receipt]);
      
      expect(result.valid).toBe(false);
      expect(result.breakPoint?.reason).toBe('Missing required gates');
    });
  });
});
