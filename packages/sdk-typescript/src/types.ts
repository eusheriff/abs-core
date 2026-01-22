/**
 * @abs/sdk-typescript - Types
 * 
 * ADR-008 compliant types for DecisionEnvelope and ExecutionReceipt.
 * These are the canonical TypeScript definitions for the ABS contract.
 */

// ============================================
// VERDICT & REASON CODES
// ============================================

/**
 * Decision verdict - the outcome of governance evaluation
 */
export type Verdict = 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL';

/**
 * Reason codes - structured categorization of decision rationale
 */
export type ReasonCode =
  | 'POLICY.VIOLATION'
  | 'RISK.EXCEEDED'
  | 'BUDGET.EXHAUSTED'
  | 'RATE.LIMITED'
  | 'OPS.MAINTENANCE';

// ============================================
// SIGNATURE
// ============================================

/**
 * Cryptographic signature for envelope integrity
 */
export interface Signature {
  /** Signing algorithm */
  alg: 'HMAC-SHA256' | 'EdDSA';
  /** Key identifier for rotation support */
  key_id: string;
  /** Signature value (hex or base64) */
  value: string;
}

// ============================================
// DECISION ENVELOPE (ADR-008 v1.0.0)
// ============================================

/**
 * Authority block - who made this decision and when
 */
export interface Authority {
  /** Policy name that produced this decision */
  policy_name: string;
  /** Policy version for reproducibility */
  policy_version: string;
  /** When the policy was evaluated */
  evaluated_at: string;
}

/**
 * Applicability gates - conditions for execution
 */
export interface Applicability {
  /** Required checks before execution (e.g., 'TENANT_ACTIVE', 'NO_INCIDENT') */
  required_checks: string[];
  /** Legal/regulatory jurisdiction */
  jurisdiction?: string;
  /** If true, decision is advisory only (no enforcement) */
  monitor_mode?: boolean;
}

/**
 * Decision context - what triggered this decision
 */
export interface DecisionContext {
  /** Tenant/organization identifier */
  tenant_id: string;
  /** Agent that requested the action */
  agent_id: string;
  /** Session for request grouping */
  session_id?: string;
  /** Type of event (e.g., 'bot.message') */
  event_type: string;
  /** Action the agent wants to perform */
  action_requested: string;
}

/**
 * DecisionEnvelope - The immutable governance decision
 * 
 * This is the core contract between ABS and executors.
 * Once created and signed, it cannot be modified.
 */
export interface DecisionEnvelope {
  /** Contract version - always "1.0.0" for ADR-008 */
  contract_version: '1.0.0';
  
  /** Unique decision identifier (UUID v4) */
  decision_id: string;
  
  /** Correlation ID for tracing */
  trace_id: string;
  
  /** When the decision was made (ISO 8601) */
  timestamp: string;
  
  /** Expiration time (ISO 8601) - after this, decision is stale */
  valid_until?: string;
  
  /** Cryptographic signature for integrity */
  signature: Signature;
  
  /** Type of decision */
  decision_type: 'GOVERNANCE' | 'OPERATIONAL';
  
  /** The verdict: ALLOW, DENY, or REQUIRE_APPROVAL */
  verdict: Verdict;
  
  /** Structured reason code */
  reason_code: ReasonCode;
  
  /** Human-readable explanation */
  reason_human: string;
  
  /** Risk score (0-100) */
  risk_score: number;
  
  /** Who made this decision */
  authority: Authority;
  
  /** Conditions for execution */
  applicability?: Applicability;
  
  /** What triggered this decision */
  context: DecisionContext;
}

// ============================================
// EXECUTION RECEIPT (ADR-008)
// ============================================

/**
 * Gate check result
 */
export interface GateResult {
  /** Check outcome */
  result: 'PASS' | 'FAIL' | 'SKIPPED';
  /** When the check was performed */
  checked_at: string;
  /** Source of the check (e.g., 'policy-service', 'manual') */
  source: string;
  /** Reason for SKIPPED (required if result is SKIPPED) */
  skip_reason?: string;
  /** Policy version that allowed skip (required if SKIPPED) */
  skip_policy_version?: string;
}

/**
 * Evidence of execution
 */
export interface Evidence {
  /** Hash of inputs */
  input_hash?: string;
  /** Hash of outputs */
  output_hash?: string;
  /** External reference IDs */
  external_refs?: string[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Execution context
 */
export interface ExecutionContext {
  /** Environment (production, staging, dev) */
  environment: string;
  /** Tenant ID */
  tenant_id: string;
  /** Additional context */
  [key: string]: unknown;
}

/**
 * ExecutionReceipt - Proof that a decision was executed
 * 
 * Links back to the DecisionEnvelope and provides evidence
 * of what actually happened during execution.
 */
export interface ExecutionReceipt {
  /** Unique receipt identifier (UUID v4) */
  receipt_id: string;
  
  /** Links to the decision that authorized this execution */
  decision_id: string;
  
  /** Unique execution instance identifier */
  execution_id: string;
  
  /** When execution occurred (ISO 8601) */
  timestamp: string;
  
  /** Who/what performed the execution */
  executor_id: string;
  
  /** Execution environment context */
  execution_context: ExecutionContext;
  
  /** Results of applicability gate checks */
  gates: Record<string, GateResult>;
  
  /** Final execution outcome */
  outcome: 'EXECUTED' | 'BLOCKED' | 'SKIPPED';
  
  /** Human-readable details */
  details?: string;
  
  /** Evidence of execution */
  evidence?: Evidence;
  
  /** Receipt signature */
  signature?: Signature;
}

// ============================================
// INPUT TYPES
// ============================================

/**
 * Event input for processing
 */
export interface EventInput {
  /** Event identifier */
  event_id: string;
  /** Tenant identifier */
  tenant_id: string;
  /** Event type (e.g., 'bot.message') */
  event_type: string;
  /** Event source */
  source: string;
  /** When event occurred */
  occurred_at: string;
  /** Event payload */
  payload: unknown;
  /** Correlation ID */
  correlation_id?: string;
}

/**
 * Process result from ABS
 */
export interface ProcessResult {
  /** Processing status */
  status: 'processed' | 'rejected' | 'failed' | 'duplicate' | 'pending_review';
  /** The decision envelope */
  envelope: DecisionEnvelope;
}

/**
 * Execution result
 */
export interface ExecutionResult<T> {
  /** Execution status */
  status: 'executed' | 'blocked' | 'skipped';
  /** The execution receipt */
  receipt: ExecutionReceipt;
  /** Result of execution (if executed) */
  result?: T;
  /** Error if blocked/skipped */
  error?: Error;
}

// ============================================
// VALIDATION TYPES
// ============================================

/**
 * Validation error detail
 */
export interface ValidationError {
  /** Field path */
  path: string;
  /** Error message */
  message: string;
  /** Error code */
  code: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Field path */
  path: string;
  /** Warning message */
  message: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Overall validity */
  valid: boolean;
  /** Errors (if any) */
  errors: ValidationError[];
  /** Warnings (non-fatal) */
  warnings: ValidationWarning[];
}

/**
 * Chain validation result
 */
export interface ChainValidationResult extends ValidationResult {
  /** Where the chain breaks (if invalid) */
  breakPoint?: {
    envelope_id?: string;
    receipt_id?: string;
    reason: string;
  };
}

/**
 * Time skew detection result
 */
export interface SkewResult {
  /** Detected skew in milliseconds */
  skewMs: number;
  /** Whether skew is within acceptable bounds */
  acceptable: boolean;
  /** Reference time source */
  reference: string;
}
