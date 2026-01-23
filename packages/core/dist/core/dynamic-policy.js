"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicPolicy = void 0;
const json_logic_js_1 = __importDefault(require("json-logic-js"));
class DynamicPolicy {
    constructor(rule) {
        this.rule = rule;
        this.name = rule.name;
        this.description = rule.description;
    }
    evaluate(proposal, event) {
        if (!this.rule.enabled)
            return 'ALLOW';
        const context = { proposal, event };
        try {
            const matched = json_logic_js_1.default.apply(this.rule.condition, context);
            if (matched) {
                const baseReason = this.rule.reason_template || `Matched dynamic policy: ${this.name}`;
                // Calculate Score
                const impact = this.rule.score_impact || 0;
                // Compatibility for legacy binary rules:
                // DENY = 100 points (Critical)
                // ALLOW = 0 points
                // ESCALATE = 50 points (Medium)
                let effectiveScore = impact;
                if (impact === 0) {
                    if (this.rule.effect === 'DENY')
                        effectiveScore = 100;
                    if (this.rule.effect === 'ESCALATE')
                        effectiveScore = 50;
                }
                // Domain Context (L3)
                const domain = this.rule.domain || 'GENERAL';
                const tags = this.rule.tags || [];
                return {
                    decision: this.rule.effect,
                    reason: baseReason,
                    score: effectiveScore,
                    domain,
                    tags
                };
            }
        }
        catch (err) {
            console.error(`[DynamicPolicy] Error evaluating rule ${this.name}:`, err);
            return 'ALLOW';
        }
        return 'ALLOW'; // Default if condition not met
    }
}
exports.DynamicPolicy = DynamicPolicy;
