import jsonLogic from 'json-logic-js';
import { Policy, DecisionResult } from './policy-registry';
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
        
        // Safety wrap for JSON Logic execution
        try {
            const matched = jsonLogic.apply(this.rule.condition, context);
            
            if (matched) {
                // If matched, apply the effect
                const baseReason = this.rule.reason_template || `Matched dynamic policy: ${this.name}`;
                
                // Simple template interpolation could live here, but keeping it simple for now
                // e.g. "Amount {{event.payload.amount}} too high"
                
                return {
                    decision: this.rule.effect,
                    reason: baseReason
                };
            }
        } catch (err) {
            console.error(`[DynamicPolicy] Error evaluating rule ${this.name}:`, err);
            // Fail open or closed? usually fail open for safety in this context unless configured otherwise
            return 'ALLOW';
        }

        return 'ALLOW'; // Default if condition not met
    }
}
