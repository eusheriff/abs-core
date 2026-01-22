/**
 * @abs/sdk-typescript - Guards
 * 
 * Hard-fail guards for enforcement. These THROW on invariant violations.
 * Use validators for inspection/audit (they return results instead of throwing).
 */

import {
  DecisionEnvelope,
  ExecutionReceipt,
  GateResult,
} from './types';

import {
  ABSExpiredError,
  ABSMonitorModeError,
  ABSVerdictError,
  ABSGateError,
  ABSClockSkewError,
  ABSInvariantError,
} from './errors';

/** Default max clock skew: 30 seconds */
const DEFAULT_MAX_SKEW_MS = 30_000;

/**
 * Guard: Envelope must NOT be in monitor mode
 * 
 * Monitor mode means the decision is advisory only.
 * Execution should not proceed.
 * 
 * @throws ABSMonitorModeError if monitor_mode is true
 */
export function guardNotMonitorMode(envelope: DecisionEnvelope): void {
  if (envelope.applicability?.monitor_mode === true) {
    throw new ABSMonitorModeError(envelope.decision_id);
  }
}

/**
 * Guard: Envelope must NOT be expired
 * 
 * If valid_until is set and has passed, the decision is stale.
 * 
 * @throws ABSExpiredError if valid_until has passed
 */
export function guardNotExpired(envelope: DecisionEnvelope, now?: Date): void {
  if (!envelope.valid_until) {
    return; // No expiration set
  }
  
  const currentTime = now ?? new Date();
  const expirationTime = new Date(envelope.valid_until);
  
  if (currentTime > expirationTime) {
    throw new ABSExpiredError(envelope.valid_until, currentTime.toISOString());
  }
}

/**
 * Guard: Verdict must be ALLOW
 * 
 * Only ALLOW verdicts permit execution.
 * 
 * @throws ABSVerdictError if verdict is not ALLOW
 */
export function guardAllowed(envelope: DecisionEnvelope): void {
  if (envelope.verdict !== 'ALLOW') {
    throw new ABSVerdictError(envelope.verdict, envelope.reason_code);
  }
}

/**
 * Guard: All gates must PASS
 * 
 * Checks all gates in the receipt. FAIL or SKIPPED without proper authorization fails.
 * 
 * @throws ABSGateError if any gate is not PASS
 */
export function guardGatesPassed(receipt: ExecutionReceipt): void {
  const failedGates: Array<{ gate: string; result: string; reason?: string }> = [];
  
  for (const [gateName, gateResult] of Object.entries(receipt.gates)) {
    if (gateResult.result === 'FAIL') {
      failedGates.push({
        gate: gateName,
        result: 'FAIL',
        reason: gateResult.source,
      });
    } else if (gateResult.result === 'SKIPPED') {
      // SKIPPED is only allowed if skip_policy_version is provided
      if (!gateResult.skip_policy_version) {
        failedGates.push({
          gate: gateName,
          result: 'SKIPPED',
          reason: 'SKIPPED without policy authorization',
        });
      }
    }
  }
  
  if (failedGates.length > 0) {
    throw new ABSGateError(failedGates);
  }
}

/**
 * Guard: Timestamp must be within acceptable clock skew
 * 
 * Detects potential clock synchronization issues.
 * 
 * @throws ABSClockSkewError if skew exceeds threshold
 */
export function guardTimeSync(
  timestamp: string,
  maxSkewMs: number = DEFAULT_MAX_SKEW_MS,
  referenceTime?: Date
): void {
  const eventTime = new Date(timestamp);
  const now = referenceTime ?? new Date();
  const skew = Math.abs(now.getTime() - eventTime.getTime());
  
  if (skew > maxSkewMs) {
    throw new ABSClockSkewError(skew, maxSkewMs);
  }
}

/**
 * Guard: Envelope is executable (combined check)
 * 
 * Runs all guards necessary to determine if an envelope can be executed:
 * 1. Not in monitor mode
 * 2. Not expired
 * 3. Verdict is ALLOW
 * 
 * @throws ABSMonitorModeError, ABSExpiredError, or ABSVerdictError
 */
export function guardExecutable(envelope: DecisionEnvelope, now?: Date): void {
  guardNotMonitorMode(envelope);
  guardNotExpired(envelope, now);
  guardAllowed(envelope);
}

/**
 * Guard: Receipt links to envelope
 * 
 * Ensures the receipt's decision_id matches the envelope's decision_id.
 * 
 * @throws ABSInvariantError if IDs don't match
 */
export function guardReceiptLinksToEnvelope(
  envelope: DecisionEnvelope,
  receipt: ExecutionReceipt
): void {
  if (receipt.decision_id !== envelope.decision_id) {
    throw new ABSInvariantError(
      `Receipt decision_id (${receipt.decision_id}) does not match envelope (${envelope.decision_id})`,
      'RECEIPT_ENVELOPE_LINK'
    );
  }
}

/**
 * Guard: Required gates are checked
 * 
 * Ensures all required checks from the envelope are present in the receipt.
 * 
 * @throws ABSInvariantError if required gates are missing
 */
export function guardRequiredGatesChecked(
  envelope: DecisionEnvelope,
  receipt: ExecutionReceipt
): void {
  const requiredChecks = envelope.applicability?.required_checks ?? [];
  const checkedGates = Object.keys(receipt.gates);
  
  const missingGates = requiredChecks.filter(gate => !checkedGates.includes(gate));
  
  if (missingGates.length > 0) {
    throw new ABSInvariantError(
      `Required gates not checked: ${missingGates.join(', ')}`,
      'MISSING_REQUIRED_GATES'
    );
  }
}
