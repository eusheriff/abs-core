/**
 * @abs/sdk-typescript - Golden Path Tests
 * 
 * Tests the happy path: Event → ALLOW → Execute → Receipt → Valid Chain
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ABSClient,
  DecisionEnvelopeBuilder,
  ExecutionReceiptBuilder,
  validateEnvelope,
  validateReceipt,
  validateChain,
  guardExecutable,
  timeProvider,
} from '../src';

describe('Golden Path: ALLOW → Execute → Receipt', () => {
  beforeEach(() => {
    timeProvider.setMockTime(null); // Use real time
  });

  it('should create a valid DecisionEnvelope with builder', () => {
    const envelope = new DecisionEnvelopeBuilder()
      .setDecisionId('550e8400-e29b-41d4-a716-446655440000')
      .setTraceId('trace-123')
      .setVerdict('ALLOW')
      .setReasonCode('POLICY.VIOLATION')
      .setReasonHuman('Action approved by policy')
      .setRiskScore(25)
      .setAuthority({
        policy_name: 'bot-policy',
        policy_version: '1.0.0',
        evaluated_at: new Date().toISOString(),
      })
      .setContext({
        tenant_id: 'tenant-1',
        agent_id: 'agent-1',
        event_type: 'bot.message',
        action_requested: 'send_message',
      })
      .setValidUntil(300) // 5 minutes TTL
      .build();

    // Validate envelope
    const result = validateEnvelope(envelope);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    
    // Verify structure
    expect(envelope.contract_version).toBe('1.0.0');
    expect(envelope.verdict).toBe('ALLOW');
    expect(envelope.decision_id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('should pass guardExecutable for valid ALLOW envelope', () => {
    const envelope = new DecisionEnvelopeBuilder()
      .setDecisionId('550e8400-e29b-41d4-a716-446655440001')
      .setTraceId('trace-124')
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
      .setValidUntil(300)
      .build();

    // Should not throw
    expect(() => guardExecutable(envelope)).not.toThrow();
  });

  it('should create a valid ExecutionReceipt linked to envelope', () => {
    const envelope = new DecisionEnvelopeBuilder()
      .setDecisionId('550e8400-e29b-41d4-a716-446655440002')
      .setTraceId('trace-125')
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

    const receipt = new ExecutionReceiptBuilder(envelope)
      .setExecutorId('executor-1')
      .setExecutionContext({
        environment: 'production',
        tenant_id: 't1',
      })
      .addGatePass('TENANT_ACTIVE', 'policy-service')
      .addGatePass('NO_INCIDENT', 'incident-service')
      .setOutcome('EXECUTED')
      .setEvidence({
        output_hash: 'abc123',
        metadata: { duration_ms: 42 },
      })
      .build();

    // Validate receipt
    const result = validateReceipt(receipt);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    
    // Verify linking
    expect(receipt.decision_id).toBe(envelope.decision_id);
    expect(receipt.outcome).toBe('EXECUTED');
    expect(Object.keys(receipt.gates)).toContain('TENANT_ACTIVE');
    expect(Object.keys(receipt.gates)).toContain('NO_INCIDENT');
  });

  it('should validate complete chain: envelope → receipt', () => {
    const envelope = new DecisionEnvelopeBuilder()
      .setDecisionId('550e8400-e29b-41d4-a716-446655440003')
      .setTraceId('trace-126')
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
      .setRequiredChecks(['TENANT_ACTIVE'])
      .build();

    const receipt = new ExecutionReceiptBuilder(envelope)
      .setExecutorId('executor-1')
      .setExecutionContext({
        environment: 'production',
        tenant_id: 't1',
      })
      .addGatePass('TENANT_ACTIVE', 'policy-service')
      .setOutcome('EXECUTED')
      .build();

    // Validate chain
    const result = validateChain(envelope, [receipt]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should execute and generate receipt via ABSClient', async () => {
    const client = new ABSClient({
      tenantId: 'tenant-1',
      agentId: 'agent-1',
      executorId: 'test-executor',
      environment: 'test',
    });

    // Create a valid envelope
    const envelope = new DecisionEnvelopeBuilder()
      .setDecisionId('550e8400-e29b-41d4-a716-446655440004')
      .setTraceId('trace-127')
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
        tenant_id: 'tenant-1',
        agent_id: 'agent-1',
        event_type: 'test',
        action_requested: 'test',
      })
      .setValidUntil(300)
      .build();

    // Execute
    const result = await client.execute(envelope, async () => {
      return { success: true, data: 'hello' };
    });

    expect(result.status).toBe('executed');
    expect(result.result).toEqual({ success: true, data: 'hello' });
    expect(result.receipt.outcome).toBe('EXECUTED');
    expect(result.receipt.decision_id).toBe(envelope.decision_id);
  });
});
