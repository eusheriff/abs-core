/**
 * @abs/sdk-typescript - Receipt Builder
 * 
 * Type-safe builder for ExecutionReceipt.
 * Ensures proper linking to DecisionEnvelope and evidence collection.
 */

import {
  DecisionEnvelope,
  ExecutionReceipt,
  GateResult,
  Evidence,
  ExecutionContext,
  Signature,
} from './types';
import { validateReceipt } from './validator';
import { ABSValidationError, ABSInvariantError } from './errors';
import { timeProvider } from './time';

/**
 * Builder for ExecutionReceipt
 * 
 * Usage:
 * ```typescript
 * const receipt = new ExecutionReceiptBuilder(envelope)
 *   .setExecutorId('worker-1')
 *   .setExecutionContext({ environment: 'production', tenant_id: 't1' })
 *   .addGatePass('TENANT_ACTIVE', 'policy-service')
 *   .addGatePass('NO_INCIDENT', 'incident-service')
 *   .setOutcome('EXECUTED')
 *   .setEvidence({ output_hash: 'abc123' })
 *   .build();
 * ```
 */
export class ExecutionReceiptBuilder {
  private receipt: Partial<ExecutionReceipt>;
  private envelope: DecisionEnvelope;
  
  /**
   * Create builder linked to a DecisionEnvelope
   */
  constructor(envelope: DecisionEnvelope) {
    this.envelope = envelope;
    this.receipt = {
      decision_id: envelope.decision_id,
      gates: {},
    };
  }
  
  /**
   * Set receipt ID (UUID v4)
   */
  setReceiptId(id: string): this {
    this.receipt.receipt_id = id;
    return this;
  }
  
  /**
   * Set execution ID (UUID v4)
   */
  setExecutionId(id: string): this {
    this.receipt.execution_id = id;
    return this;
  }
  
  /**
   * Set timestamp (defaults to now if not called)
   */
  setTimestamp(timestamp: string): this {
    this.receipt.timestamp = timestamp;
    return this;
  }
  
  /**
   * Set executor ID
   */
  setExecutorId(executorId: string): this {
    this.receipt.executor_id = executorId;
    return this;
  }
  
  /**
   * Set execution context
   */
  setExecutionContext(context: ExecutionContext): this {
    this.receipt.execution_context = context;
    return this;
  }
  
  /**
   * Add a PASS gate result
   */
  addGatePass(gateName: string, source: string): this {
    this.receipt.gates![gateName] = {
      result: 'PASS',
      checked_at: timeProvider.nowISO(),
      source,
    };
    return this;
  }
  
  /**
   * Add a FAIL gate result
   */
  addGateFail(gateName: string, source: string): this {
    this.receipt.gates![gateName] = {
      result: 'FAIL',
      checked_at: timeProvider.nowISO(),
      source,
    };
    return this;
  }
  
  /**
   * Add a SKIPPED gate result
   * 
   * IMPORTANT: Requires explicit acknowledgment and policy version
   */
  addGateSkipped(
    gateName: string,
    source: string,
    options: { iKnowWhatImDoing: true; policyVersion: string; reason: string }
  ): this {
    if (!options.iKnowWhatImDoing) {
      throw new ABSInvariantError(
        'SKIPPED gates require explicit acknowledgment',
        'GATE_SKIP_ACKNOWLEDGMENT'
      );
    }
    
    this.receipt.gates![gateName] = {
      result: 'SKIPPED',
      checked_at: timeProvider.nowISO(),
      source,
      skip_reason: options.reason,
      skip_policy_version: options.policyVersion,
    };
    return this;
  }
  
  /**
   * Set gate result directly
   */
  setGate(gateName: string, result: GateResult): this {
    this.receipt.gates![gateName] = result;
    return this;
  }
  
  /**
   * Set execution outcome
   */
  setOutcome(outcome: 'EXECUTED' | 'BLOCKED' | 'SKIPPED'): this {
    this.receipt.outcome = outcome;
    return this;
  }
  
  /**
   * Set details
   */
  setDetails(details: string): this {
    this.receipt.details = details;
    return this;
  }
  
  /**
   * Set evidence
   */
  setEvidence(evidence: Evidence): this {
    this.receipt.evidence = evidence;
    return this;
  }
  
  /**
   * Set signature
   */
  setSignature(signature: Signature): this {
    this.receipt.signature = signature;
    return this;
  }
  
  /**
   * Auto-populate required gates from envelope applicability
   * All gates will be marked as PASS with the given source
   */
  autoPassRequiredGates(source: string): this {
    const requiredChecks = this.envelope.applicability?.required_checks ?? [];
    for (const check of requiredChecks) {
      if (!this.receipt.gates![check]) {
        this.addGatePass(check, source);
      }
    }
    return this;
  }
  
  /**
   * Build the receipt
   * 
   * @throws ABSValidationError if required fields are missing or invalid
   */
  build(): ExecutionReceipt {
    // Generate IDs if not set
    if (!this.receipt.receipt_id) {
      this.receipt.receipt_id = crypto.randomUUID();
    }
    if (!this.receipt.execution_id) {
      this.receipt.execution_id = crypto.randomUUID();
    }
    if (!this.receipt.timestamp) {
      this.receipt.timestamp = timeProvider.nowISO();
    }
    
    // Default evidence if not set
    if (!this.receipt.evidence) {
      this.receipt.evidence = {
        metadata: { auto_generated: true },
      };
    }
    
    // Validate
    const result = validateReceipt(this.receipt);
    if (!result.valid) {
      throw new ABSValidationError(
        'Failed to build ExecutionReceipt: validation failed',
        result.errors
      );
    }
    
    return this.receipt as ExecutionReceipt;
  }
  
  /**
   * Build without validation (use with caution)
   */
  buildUnsafe(): ExecutionReceipt {
    if (!this.receipt.receipt_id) {
      this.receipt.receipt_id = crypto.randomUUID();
    }
    if (!this.receipt.execution_id) {
      this.receipt.execution_id = crypto.randomUUID();
    }
    if (!this.receipt.timestamp) {
      this.receipt.timestamp = timeProvider.nowISO();
    }
    return this.receipt as ExecutionReceipt;
  }
}
