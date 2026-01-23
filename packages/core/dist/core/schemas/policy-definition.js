"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyRuleSchema = void 0;
const zod_1 = require("zod");
exports.PolicyRuleSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    target_event_type: zod_1.z.string().or(zod_1.z.array(zod_1.z.string())), // Single type or array of types
    priority: zod_1.z.number().default(100),
    condition: zod_1.z.record(zod_1.z.any()), // JSON Logic object
    effect: zod_1.z.enum(['ALLOW', 'DENY', 'ESCALATE', 'MONITOR']),
    score_impact: zod_1.z.number().optional(), // Points to add if matched (e.g. 20)
    reason_template: zod_1.z.string().optional(),
    enabled: zod_1.z.boolean().default(true)
});
