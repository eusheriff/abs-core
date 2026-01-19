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

// Policy Decision
export const PolicyDecisionSchema = z.object({
  decision_id: z.string().uuid().optional(), // Can be same as proposal or new
  policy_decision: z.enum(['allow', 'deny', 'escalate']),
  policy_trace: z.object({
    matched_rules: z.array(z.string()),
    violated_rules: z.array(z.string()),
    computed_fields: z.record(z.any()).optional(),
  }),
  required_human_review: z.boolean(),
});

export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;

// Decision Log
export const DecisionLogSchema = z.object({
  decision_id: z.string().uuid(),
  tenant_id: z.string(),
  event_id: z.string().uuid(),
  correlation_id: z.string(),
  timestamp: z.string().datetime(),
  inputs_snapshot: z.record(z.any()),
  decision_proposal: DecisionProposalSchema,
  policy_decision: PolicyDecisionSchema,
  final_action: z.string(),
  execution_result: z.enum(['success', 'fail', 'skipped', 'pending_review']),
});

export type DecisionLog = z.infer<typeof DecisionLogSchema>;
