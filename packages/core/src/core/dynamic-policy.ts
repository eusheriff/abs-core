import jsonLogic from 'json-logic-js';
import { Policy, DecisionResult } from './interfaces';
import { DecisionProposal, EventEnvelope } from './schemas';
import { PolicyRule } from './schemas/policy-definition';

export class DynamicPolicy implements Policy {
    public name: string;
    public description?: string;

    constructor(private rule: PolicyRule) {
        this.name = rule.name;
        this.description = rule.description;
    }

    evaluate(proposal: DecisionProposal, event: EventEnvelope): DecisionResult {
        if (!this.rule.enabled) return 'ALLOW';

        const context = { proposal, event };
        
        try {
            const matched = jsonLogic.apply(this.rule.condition, context);
            
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
                     if (this.rule.effect === 'DENY') effectiveScore = 100;
                     if (this.rule.effect === 'ESCALATE') effectiveScore = 50;
                }

                // Domain Context (L3)
                const domain = (this.rule as any).domain || 'GENERAL';
                const tags = (this.rule as any).tags || [];

                return {
                    decision: this.rule.effect,
                    reason: baseReason,
                    score: effectiveScore,
                    domain,
                    tags
                };
            }
        } catch (err) {
            console.error(`[DynamicPolicy] Error evaluating rule ${this.name}:`, err);
            return 'ALLOW';
        }

        return 'ALLOW'; // Default if condition not met
    }
}
