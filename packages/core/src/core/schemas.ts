import { z } from 'zod';

// Event Envelope
export const EventEnvelopeSchema = z.object({
  event_id: z.string().uuid(),
  event_type: z.string(),
  source: z.string(),
  tenant_id: z.string(),
  correlation_id: z.string(),
  occurred_at: z.string().datetime(),
  payload: z.record(z.any()),
  metadata: z.object({
    channel: z.string().optional(),
    actor: z.string().optional(),
    session_id: z.string().optional(),
    risk_hint: z.enum(['low', 'medium', 'high']).optional(),
  }).optional(),
});

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

// Decision Proposal
export const DecisionProposalSchema = z.object({
  proposal_id: z.string().uuid(),
  process_id: z.string(),
  current_state: z.string(),
  recommended_action: z.string(),
  action_params: z.record(z.any()),
  explanation: z.object({
    summary: z.string(),
    rationale: z.string(),
    evidence_refs: z.array(z.string()),
  }),
  confidence: z.number().min(0).max(1),
  risk_level: z.enum(['low', 'medium', 'high']),
});

export type DecisionProposal = z.infer<typeof DecisionProposalSchema>;

// --- ADR-008: Decision Envelope v1 Definitions ---

// Enums (Normative)
export const VerdictSchema = z.enum([
  'ALLOW',
  'DENY',
  'REQUIRE_APPROVAL',
  'ALLOW_WITH_CONSTRAINTS',
  'SYSTEM_FAILURE'
]);

export const DecisionTypeSchema = z.enum([
  'GOVERNANCE',
  'SYSTEM_ERROR'
]);

export const ReasonCodeSchema = z.enum([
  // Access Control
  'AUTH.INVALID', 'AUTH.SCOPE_MISSING',
  // Policy & Risk
  'POLICY.VIOLATION', 'RISK.EXCEEDED', 'SEQUENCE.VIOLATION',
  // Integrity
  'INPUT.INJECTION', 'INPUT.MALFORMED', 'INTEGRITY.TAMPERED',
  // Operational
  // Operational
  'OPS.RATE_LIMIT', 'OPS.MAINTENANCE', 'OPS.INTERNAL_ERROR'
]);

export const ApplicabilityGateSchema = z.enum([
  'JURISDICTION_MATCH',
  'INCIDENT_CLEAR',
  'TENANT_ACTIVE',
  'POLICY_ACTIVE'
]);

// Helper Types
export type Verdict = z.infer<typeof VerdictSchema>;
export type DecisionType = z.infer<typeof DecisionTypeSchema>;
export type ReasonCode = z.infer<typeof ReasonCodeSchema>;
export type ApplicabilityGate = z.infer<typeof ApplicabilityGateSchema>;

// Decision Envelope (The Product)
export const DecisionEnvelopeSchema = z.object({
  // 1. Contract Metadata
  contract_version: z.literal("1.0.0"),

  // 2. Identity & Integrity
  decision_id: z.string().uuid(),
  trace_id: z.string(),
  timestamp: z.string().datetime(),
  valid_until: z.string().datetime().optional(), // ISO-8601 Expiry

  signature: z.object({
    alg: z.literal("HMAC-SHA256"),
    key_id: z.string(),
    value: z.string() // Hex seal
  }),

  // 3. The Verdict
  decision_type: DecisionTypeSchema,
  verdict: VerdictSchema,

  // 4. Rationale
  reason_code: ReasonCodeSchema,
  reason_human: z.string(),
  risk_score: z.number().min(0).max(100),

  // 5. Authority
  authority: z.object({
    type: z.enum(['POLICY', 'HUMAN', 'SYSTEM']),
    id: z.string(),
    delegation_chain: z.array(z.string()).optional()
  }),

  // 6. Governance Context
  jurisdiction: z.string().optional(),
  policy_id: z.string(),
  policy_version: z.string().optional(),
  monitor_mode: z.boolean().default(false),

  // 7. Operations
  applicability: z.object({
    required_checks: z.array(ApplicabilityGateSchema)
  }).optional(),
  constraints: z.array(z.string()).optional(),
  required_actions: z.array(z.string()).optional(),
  
  // 8. Legacy/Compat Fields (kept but deprecated if needed)
  latency_ms: z.number().optional()
}).refine(data => {
  // ADR-008 Invariant 1: State Consistency
  if (data.decision_type === 'GOVERNANCE' && data.verdict === 'SYSTEM_FAILURE') return false;
  if (data.decision_type === 'SYSTEM_ERROR' && data.verdict !== 'SYSTEM_FAILURE') return false;
  return true;
}, {
  message: "Invariant Violation: decision_type and verdict mismatch (ADR-008)"
});

export type DecisionEnvelope = z.infer<typeof DecisionEnvelopeSchema>;

// Decision Log (DB View)
export const DecisionLogSchema = z.object({
  decision_id: z.string().uuid(),
  tenant_id: z.string(),
  event_id: z.string(),
  policy_name: z.string(),
  provider: z.string(),
  decision: z.string(),
  risk_score: z.number(),
  execution_status: z.string(),
  execution_response: z.string(),
  full_log_json: z.string(),
  timestamp: z.string().datetime(),
  signature: z.string()
});

export type DecisionLog = z.infer<typeof DecisionLogSchema>;

export * from './schemas/policy-definition';

export const ExecutionReceiptSchema = z.object({
  receipt_id: z.string().uuid(),
  decision_id: z.string().uuid(),
  execution_id: z.string().uuid(),
  timestamp: z.string().datetime(),
  executor_id: z.string(), // Who executed (System/Component ID)
  execution_context: z.object({
    region: z.string().optional(),
    environment: z.string().optional(),
    tenant_id: z.string()
  }),
  gates: z.record(ApplicabilityGateSchema, z.object({
    result: z.enum(['PASS', 'FAIL', 'SKIPPED']),
    checked_at: z.string().datetime(),
    source: z.string().optional(), // System ID of the authority check
    details: z.string().optional()
  })),
  outcome: z.enum(['EXECUTED', 'BLOCKED']),
  details: z.string().optional()
});

export type ExecutionReceipt = z.infer<typeof ExecutionReceiptSchema>;
