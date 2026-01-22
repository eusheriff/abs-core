/**
 * @abs/sdk-typescript - Errors
 * 
 * Typed errors for ABS SDK operations.
 * All guards throw these errors on invariant violations.
 */

/**
 * Base error for all ABS SDK errors
 */
export class ABSError extends Error {
  readonly code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = 'ABSError';
    this.code = code;
    Object.setPrototypeOf(this, ABSError.prototype);
  }
}

/**
 * Validation error - envelope or receipt failed validation
 */
export class ABSValidationError extends ABSError {
  readonly errors: Array<{ path: string; message: string }>;
  
  constructor(message: string, errors: Array<{ path: string; message: string }>) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ABSValidationError';
    this.errors = errors;
    Object.setPrototypeOf(this, ABSValidationError.prototype);
  }
}

/**
 * Invariant error - a core invariant was violated
 */
export class ABSInvariantError extends ABSError {
  readonly invariant: string;
  
  constructor(message: string, invariant: string) {
    super(message, 'INVARIANT_VIOLATION');
    this.name = 'ABSInvariantError';
    this.invariant = invariant;
    Object.setPrototypeOf(this, ABSInvariantError.prototype);
  }
}

/**
 * Expired error - decision valid_until has passed
 */
export class ABSExpiredError extends ABSError {
  readonly validUntil: string;
  readonly now: string;
  
  constructor(validUntil: string, now: string) {
    super(`Decision expired at ${validUntil} (current time: ${now})`, 'DECISION_EXPIRED');
    this.name = 'ABSExpiredError';
    this.validUntil = validUntil;
    this.now = now;
    Object.setPrototypeOf(this, ABSExpiredError.prototype);
  }
}

/**
 * Monitor mode error - attempted execution in monitor mode
 */
export class ABSMonitorModeError extends ABSError {
  readonly decisionId: string;
  
  constructor(decisionId: string) {
    super(`Decision ${decisionId} is in monitor mode - execution not allowed`, 'MONITOR_MODE');
    this.name = 'ABSMonitorModeError';
    this.decisionId = decisionId;
    Object.setPrototypeOf(this, ABSMonitorModeError.prototype);
  }
}

/**
 * Verdict error - verdict is not ALLOW
 */
export class ABSVerdictError extends ABSError {
  readonly verdict: string;
  readonly reasonCode: string;
  
  constructor(verdict: string, reasonCode: string) {
    super(`Verdict is ${verdict} (${reasonCode}) - execution not allowed`, 'VERDICT_NOT_ALLOW');
    this.name = 'ABSVerdictError';
    this.verdict = verdict;
    this.reasonCode = reasonCode;
    Object.setPrototypeOf(this, ABSVerdictError.prototype);
  }
}

/**
 * Gate error - one or more applicability gates failed
 */
export class ABSGateError extends ABSError {
  readonly failedGates: Array<{ gate: string; result: string; reason?: string }>;
  
  constructor(failedGates: Array<{ gate: string; result: string; reason?: string }>) {
    const gateList = failedGates.map(g => `${g.gate}=${g.result}`).join(', ');
    super(`Gate check failed: ${gateList}`, 'GATE_FAILURE');
    this.name = 'ABSGateError';
    this.failedGates = failedGates;
    Object.setPrototypeOf(this, ABSGateError.prototype);
  }
}

/**
 * Clock skew error - time synchronization issue detected
 */
export class ABSClockSkewError extends ABSError {
  readonly skewMs: number;
  readonly maxAllowedMs: number;
  
  constructor(skewMs: number, maxAllowedMs: number) {
    super(`Clock skew detected: ${skewMs}ms exceeds maximum allowed ${maxAllowedMs}ms`, 'CLOCK_SKEW');
    this.name = 'ABSClockSkewError';
    this.skewMs = skewMs;
    this.maxAllowedMs = maxAllowedMs;
    Object.setPrototypeOf(this, ABSClockSkewError.prototype);
  }
}

/**
 * Chain break error - envelope-receipt chain is broken
 */
export class ABSChainBreakError extends ABSError {
  readonly envelopeId?: string;
  readonly receiptId?: string;
  readonly reason: string;
  
  constructor(reason: string, envelopeId?: string, receiptId?: string) {
    super(`Chain of custody broken: ${reason}`, 'CHAIN_BREAK');
    this.name = 'ABSChainBreakError';
    this.envelopeId = envelopeId;
    this.receiptId = receiptId;
    this.reason = reason;
    Object.setPrototypeOf(this, ABSChainBreakError.prototype);
  }
}

/**
 * Signature error - signature verification failed
 */
export class ABSSignatureError extends ABSError {
  readonly keyId: string;
  
  constructor(message: string, keyId: string) {
    super(message, 'SIGNATURE_INVALID');
    this.name = 'ABSSignatureError';
    this.keyId = keyId;
    Object.setPrototypeOf(this, ABSSignatureError.prototype);
  }
}
