"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecisionLogSchema = exports.PolicyDecisionSchema = exports.DecisionProposalSchema = exports.EventEnvelopeSchema = void 0;
const zod_1 = require("zod");
// Event Envelope
exports.EventEnvelopeSchema = zod_1.z.object({
    event_id: zod_1.z.string().uuid(),
    event_type: zod_1.z.string(),
    source: zod_1.z.string(),
    tenant_id: zod_1.z.string(),
    correlation_id: zod_1.z.string(),
    occurred_at: zod_1.z.string().datetime(),
    payload: zod_1.z.record(zod_1.z.any()),
    metadata: zod_1.z.object({
        channel: zod_1.z.string().optional(),
        actor: zod_1.z.string().optional(),
        risk_hint: zod_1.z.enum(['low', 'medium', 'high']).optional(),
    }).optional(),
});
// Decision Proposal
exports.DecisionProposalSchema = zod_1.z.object({
    proposal_id: zod_1.z.string().uuid(),
    process_id: zod_1.z.string(),
    current_state: zod_1.z.string(),
    recommended_action: zod_1.z.string(),
    action_params: zod_1.z.record(zod_1.z.any()),
    explanation: zod_1.z.object({
        summary: zod_1.z.string(),
        rationale: zod_1.z.string(),
        evidence_refs: zod_1.z.array(zod_1.z.string()),
    }),
    confidence: zod_1.z.number().min(0).max(1),
    risk_level: zod_1.z.enum(['low', 'medium', 'high']),
});
// Policy Decision
exports.PolicyDecisionSchema = zod_1.z.object({
    decision_id: zod_1.z.string().uuid().optional(), // Can be same as proposal or new
    policy_decision: zod_1.z.enum(['allow', 'deny', 'escalate']),
    risk_score: zod_1.z.number().min(0).max(100).default(0), // 0-100 Score
    policy_trace: zod_1.z.object({
        matched_rules: zod_1.z.array(zod_1.z.string()),
        violated_rules: zod_1.z.array(zod_1.z.string()),
        risk_factors: zod_1.z.array(zod_1.z.string()).optional(), // Reasons for score
        computed_fields: zod_1.z.record(zod_1.z.any()).optional(),
    }),
    required_human_review: zod_1.z.boolean(),
});
// Decision Log
exports.DecisionLogSchema = zod_1.z.object({
    decision_id: zod_1.z.string().uuid(),
    tenant_id: zod_1.z.string(),
    event_id: zod_1.z.string().uuid(),
    correlation_id: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    inputs_snapshot: zod_1.z.record(zod_1.z.any()),
    decision_proposal: exports.DecisionProposalSchema,
    policy_decision: exports.PolicyDecisionSchema,
    final_action: zod_1.z.string(),
    execution_result: zod_1.z.enum(['success', 'fail', 'skipped', 'pending_review']),
});
__exportStar(require("./schemas/policy-definition"), exports);
