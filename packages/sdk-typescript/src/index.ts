/**
 * @abs/sdk-typescript
 * 
 * Official ABS SDK for TypeScript
 * The executable contract for AI agent governance (ADR-008)
 * 
 * @example
 * ```typescript
 * import { ABSClient, guardExecutable } from '@abs/sdk-typescript';
 * 
 * const client = new ABSClient({
 *   tenantId: 'my-tenant',
 *   agentId: 'my-agent',
 * });
 * 
 * const result = await client.process(event);
 * guardExecutable(result.envelope); // Throws if not executable
 * ```
 */

// Client
export { ABSClient, ABSClientConfig } from './client';

// Types
export {
  // Core types
  DecisionEnvelope,
  ExecutionReceipt,
  Verdict,
  ReasonCode,
  
  // Sub-types
  Signature,
  Authority,
  Applicability,
  DecisionContext,
  GateResult,
  Evidence,
  ExecutionContext,
  
  // Input/Output types
  EventInput,
  ProcessResult,
  ExecutionResult,
  
  // Validation types
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ChainValidationResult,
  SkewResult,
} from './types';

// Builders
export { DecisionEnvelopeBuilder } from './envelope';
export { ExecutionReceiptBuilder } from './receipt';

// Validation (returns results)
export {
  validateEnvelope,
  validateReceipt,
  validateChain,
} from './validator';

// Guards (throw on violation)
export {
  guardNotMonitorMode,
  guardNotExpired,
  guardAllowed,
  guardGatesPassed,
  guardTimeSync,
  guardExecutable,
  guardReceiptLinksToEnvelope,
  guardRequiredGatesChecked,
} from './guards';

// Errors
export {
  ABSError,
  ABSValidationError,
  ABSInvariantError,
  ABSExpiredError,
  ABSMonitorModeError,
  ABSVerdictError,
  ABSGateError,
  ABSClockSkewError,
  ABSChainBreakError,
  ABSSignatureError,
} from './errors';

// Time
export { TimeProvider, timeProvider } from './time';
