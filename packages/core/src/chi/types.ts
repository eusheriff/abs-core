/**
 * CHI - Cognitive Host Interface Types
 * 
 * Implements ADR-004: Cognitive Host Interface
 * 
 * These types define the declarative schemas for:
 * - Cognition Profile (how agents CAN behave)
 * - LLM Policy (which models/capabilities are allowed)
 * - CHI Analysis (auditable output from introspection)
 * 
 * INVARIANTS (from ADR-004):
 * - CHI-I1: CHI NEVER executes code
 * - CHI-I2: CHI NEVER calls LLM APIs
 * - CHI-I3: CHI NEVER invokes tools
 * - CHI-I4: CHI ONLY produces analysis and constraints
 * - CHI-I5: All CHI decisions flow through PDP
 * - CHI-I6: CHI is stateless
 */

// ============================================
// 1. COGNITION PROFILE
// ============================================

/**
 * Loop types that the agent can use
 */
export type LoopType = 'plan-act-observe' | 'react' | 'reflexion' | 'custom';

/**
 * Autonomy levels
 */
export type AutonomyLevel = 'low' | 'medium' | 'high';

/**
 * Memory scope
 */
export type MemoryScope = 'session' | 'project' | 'workspace';

/**
 * Risk threshold
 */
export type RiskThreshold = 'low' | 'medium' | 'high';

/**
 * Cognition Profile - Declarative constraints for agent behavior
 * 
 * This is the nucleus of CHI. It describes HOW agents can behave,
 * without ever executing anything.
 */
export interface CognitionProfile {
  /** Schema version */
  version: string;
  
  /** Loop behavior */
  loop_type: LoopType;
  max_iterations: number;
  autonomy_level: AutonomyLevel;
  
  /** Memory scope */
  memory_scope: MemoryScope;
  
  /** Risk threshold */
  risk_threshold: RiskThreshold;
  
  /** Actions requiring approval (glob patterns) */
  requires_approval_on: string[];
  
  /** Forbidden actions (glob patterns) */
  forbid: string[];
}

/**
 * Default cognition profile (restrictive)
 */
export const DEFAULT_COGNITION_PROFILE: CognitionProfile = {
  version: '1.0.0',
  loop_type: 'plan-act-observe',
  max_iterations: 5,
  autonomy_level: 'low',
  memory_scope: 'project',
  risk_threshold: 'medium',
  requires_approval_on: [
    'fs.write:_consolidated/*',
    'fs.delete:**/*',
    'net.call:external',
    'tool.execute:dangerous',
  ],
  forbid: [
    'fs.write:*.pem',
    'fs.write:*.key',
    'fs.write:*.env',
    'fs.write:.env*',
  ],
};

// ============================================
// 2. LLM POLICY
// ============================================

/**
 * LLM Policy - Declares which models and capabilities are allowed
 * 
 * ABS NEVER calls models directly. This only governs what CAN be used.
 */
export interface LLMPolicy {
  /** Schema version */
  version: string;
  
  /** Allowed models (empty = all allowed) */
  allowed_models: string[];
  
  /** Forbidden capabilities */
  forbid_capabilities: string[];
  
  /** Token limits */
  max_tokens: number;
  max_context: number;
  
  /** Rate limits */
  max_calls_per_minute: number;
}

/**
 * Default LLM policy (permissive but rate-limited)
 */
export const DEFAULT_LLM_POLICY: LLMPolicy = {
  version: '1.0.0',
  allowed_models: [], // Empty = all allowed
  forbid_capabilities: [
    'web_browse',
    'tool_auto_execute',
    'code_interpreter',
  ],
  max_tokens: 4096,
  max_context: 128000,
  max_calls_per_minute: 30,
};

// ============================================
// 3. CHI ANALYSIS (Auditable Output)
// ============================================

/**
 * Confidence level for CHI analysis
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Inferred risk types
 */
export type InferredRisk =
  | 'irreversible_state_mutation'
  | 'audit_log_modification'
  | 'credential_exposure'
  | 'network_exfiltration'
  | 'privilege_escalation'
  | 'rate_limit_exceeded'
  | 'unknown';

/**
 * Suggested constraint types
 */
export type SuggestedConstraint =
  | 'require_wal_event'
  | 'require_approval'
  | 'max_scope:session'
  | 'max_scope:project'
  | 'max_scope:workspace'
  | 'rate_limit'
  | 'deny';

/**
 * Risk forecast request context
 */
export interface RiskForecastContext {
  action: string;
  target: string;
  scope: string;
}

/**
 * CHI Analysis - Structured, auditable output from introspection
 * 
 * This is what CHI produces. It NEVER executes, only analyzes.
 */
export interface CHIAnalysis {
  /** Analysis timestamp */
  timestamp: string;
  
  /** Trace ID for correlation */
  trace_id: string;
  
  /** Detected intents from workflow/action */
  detected_intents: string[];
  
  /** Inferred risks */
  inferred_risks: InferredRisk[];
  
  /** Suggested constraints */
  suggested_constraints: SuggestedConstraint[];
  
  /** Confidence level */
  confidence: ConfidenceLevel;
  
  /** Reasoning trace (for auditing) */
  reasoning: string[];
  
  /** Request risk forecast? (CHI may request, but MUST NOT decide) */
  request_risk_forecast: boolean;
  
  /** Risk forecast context (if requested) */
  risk_forecast_context?: RiskForecastContext;
}

/**
 * Create an empty CHI analysis
 */
export function createEmptyCHIAnalysis(traceId: string): CHIAnalysis {
  return {
    timestamp: new Date().toISOString(),
    trace_id: traceId,
    detected_intents: [],
    inferred_risks: [],
    suggested_constraints: [],
    confidence: 'low',
    reasoning: [],
    request_risk_forecast: false,
  };
}

// ============================================
// 4. CHI CONFORMANCE (from ADR-004 Section 8)
// ============================================

/**
 * CHI Conformance requirements
 * Any implementation MUST satisfy these
 */
export interface CHIConformance {
  /** CHI-C1: No code execution */
  no_code_execution: boolean;
  
  /** CHI-C2: No external calls */
  no_external_calls: boolean;
  
  /** CHI-C3: Structured output only */
  structured_output_only: boolean;
  
  /** CHI-C4: Stateless operation */
  stateless_operation: boolean;
  
  /** CHI-C5: Deterministic analysis */
  deterministic_analysis: boolean;
}

/**
 * Validate that a CHI implementation is conformant
 */
export function validateCHIConformance(conformance: CHIConformance): boolean {
  return (
    conformance.no_code_execution &&
    conformance.no_external_calls &&
    conformance.structured_output_only &&
    conformance.stateless_operation &&
    conformance.deterministic_analysis
  );
}

// ============================================
// 5. LAYER TYPES (from ADR-005)
// ============================================

/**
 * Trust levels (from ADR-005)
 */
export type TrustLevel = 'kernel' | 'profile' | 'workspace' | 'input';

/**
 * Layer metadata
 */
export interface LayerMetadata {
  trust_level: TrustLevel;
  source: string;
  timestamp: string;
}

/**
 * Get trust level rank (higher = more trusted)
 */
export function getTrustRank(level: TrustLevel): number {
  switch (level) {
    case 'kernel': return 100;
    case 'profile': return 75;
    case 'workspace': return 50;
    case 'input': return 0;
  }
}

/**
 * Check if source layer can override target layer
 * Rule: Each layer can only RESTRICT, never EXPAND the layer above it
 */
export function canOverride(source: TrustLevel, target: TrustLevel): boolean {
  return getTrustRank(source) >= getTrustRank(target);
}
