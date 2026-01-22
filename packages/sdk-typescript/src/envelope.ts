/**
 * @abs/sdk-typescript - Envelope Builder
 * 
 * Type-safe builder for DecisionEnvelope.
 * Ensures all required fields are set before building.
 */

import {
  DecisionEnvelope,
  Verdict,
  ReasonCode,
  Authority,
  Applicability,
  DecisionContext,
  Signature,
} from './types';
import { validateEnvelope } from './validator';
import { ABSValidationError } from './errors';
import { timeProvider } from './time';

/**
 * Builder for DecisionEnvelope
 * 
 * Usage:
 * ```typescript
 * const envelope = new DecisionEnvelopeBuilder()
 *   .setDecisionId(uuid())
 *   .setTraceId(traceId)
 *   .setVerdict('ALLOW')
 *   .setReasonCode('POLICY.VIOLATION')
 *   .setReasonHuman('Action approved')
 *   .setRiskScore(25)
 *   .setAuthority({ policy_name: 'bot-policy', policy_version: '1.0.0', evaluated_at: now })
 *   .setContext({ tenant_id: 't1', agent_id: 'a1', event_type: 'bot.message', action_requested: 'send' })
 *   .build();
 * ```
 */
export class DecisionEnvelopeBuilder {
  private envelope: Partial<DecisionEnvelope> = {
    contract_version: '1.0.0',
    decision_type: 'GOVERNANCE',
  };
  
  /**
   * Set decision ID (UUID v4)
   */
  setDecisionId(id: string): this {
    this.envelope.decision_id = id;
    return this;
  }
  
  /**
   * Set trace ID for correlation
   */
  setTraceId(traceId: string): this {
    this.envelope.trace_id = traceId;
    return this;
  }
  
  /**
   * Set timestamp (defaults to now if not called)
   */
  setTimestamp(timestamp: string): this {
    this.envelope.timestamp = timestamp;
    return this;
  }
  
  /**
   * Set expiration time
   * @param validUntil ISO 8601 timestamp or TTL in seconds
   */
  setValidUntil(validUntil: string | number): this {
    if (typeof validUntil === 'number') {
      this.envelope.valid_until = timeProvider.validUntil(validUntil);
    } else {
      this.envelope.valid_until = validUntil;
    }
    return this;
  }
  
  /**
   * Set signature
   */
  setSignature(signature: Signature): this {
    this.envelope.signature = signature;
    return this;
  }
  
  /**
   * Set decision type
   */
  setDecisionType(type: 'GOVERNANCE' | 'OPERATIONAL'): this {
    this.envelope.decision_type = type;
    return this;
  }
  
  /**
   * Set verdict
   */
  setVerdict(verdict: Verdict): this {
    this.envelope.verdict = verdict;
    return this;
  }
  
  /**
   * Set reason code
   */
  setReasonCode(code: ReasonCode): this {
    this.envelope.reason_code = code;
    return this;
  }
  
  /**
   * Set human-readable reason
   */
  setReasonHuman(reason: string): this {
    this.envelope.reason_human = reason;
    return this;
  }
  
  /**
   * Set risk score (0-100)
   */
  setRiskScore(score: number): this {
    if (score < 0 || score > 100) {
      throw new Error('Risk score must be between 0 and 100');
    }
    this.envelope.risk_score = score;
    return this;
  }
  
  /**
   * Set authority block
   */
  setAuthority(authority: Authority): this {
    this.envelope.authority = authority;
    return this;
  }
  
  /**
   * Set applicability conditions
   */
  setApplicability(applicability: Applicability): this {
    this.envelope.applicability = applicability;
    return this;
  }
  
  /**
   * Enable monitor mode (advisory only, no enforcement)
   */
  setMonitorMode(enabled: boolean): this {
    if (!this.envelope.applicability) {
      this.envelope.applicability = { required_checks: [] };
    }
    this.envelope.applicability.monitor_mode = enabled;
    return this;
  }
  
  /**
   * Set required checks
   */
  setRequiredChecks(checks: string[]): this {
    if (!this.envelope.applicability) {
      this.envelope.applicability = { required_checks: [] };
    }
    this.envelope.applicability.required_checks = checks;
    return this;
  }
  
  /**
   * Set context
   */
  setContext(context: DecisionContext): this {
    this.envelope.context = context;
    return this;
  }
  
  /**
   * Build the envelope
   * 
   * @throws ABSValidationError if required fields are missing or invalid
   */
  build(): DecisionEnvelope {
    // Set defaults
    if (!this.envelope.timestamp) {
      this.envelope.timestamp = timeProvider.nowISO();
    }
    
    // Placeholder signature if not set (should be signed properly in real usage)
    if (!this.envelope.signature) {
      this.envelope.signature = {
        alg: 'HMAC-SHA256',
        key_id: 'unsigned',
        value: 'pending',
      };
    }
    
    // Validate
    const result = validateEnvelope(this.envelope);
    if (!result.valid) {
      throw new ABSValidationError(
        'Failed to build DecisionEnvelope: validation failed',
        result.errors
      );
    }
    
    return this.envelope as DecisionEnvelope;
  }
  
  /**
   * Build without validation (use with caution)
   */
  buildUnsafe(): DecisionEnvelope {
    if (!this.envelope.timestamp) {
      this.envelope.timestamp = timeProvider.nowISO();
    }
    return this.envelope as DecisionEnvelope;
  }
}
