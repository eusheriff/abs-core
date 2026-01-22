import { PolicyEngine, Policy, DecisionResult } from './interfaces';
import { SimplePolicyEngine } from './policy';
import { BotOperationalPolicy } from './policy-bot-operational';
import { WhatsAppBotPolicy } from './policy-whatsapp-bot';
import { DynamicPolicy } from './dynamic-policy';
import { PolicyRule } from './schemas/policy-definition';
import { CHIPolicy } from '../policies/chi-policy';

// Re-export types for convenience
export type { PolicyEngine, PolicyResult, Policy, DecisionResult } from './interfaces';

export class PolicyRegistry {
    private static policies: Map<string, Policy> = new Map();
    private static defaultPolicy: Policy = new SimplePolicyEngine() as any;

    // Initialize with policies for different event types
    static {
        // WhatsApp-specific policy (more detailed, 6 rules)
        this.register('whatsapp', new WhatsAppBotPolicy() as unknown as Policy);
        // Generic bot policy (5 rules)
        this.register('bot', new BotOperationalPolicy() as any);
        
        // CHI Policy (ADR-004) - Default governance layer
        this.register('chi', new CHIPolicy() as any);
    }

    static register(eventTypePrefix: string, policy: Policy) {
        this.policies.set(eventTypePrefix, policy);
        console.log(`[PolicyRegistry] Registered policy for prefix '${eventTypePrefix}': ${policy.name || 'Unnamed'}`);
    }

    static loadRules(rules: PolicyRule[]) {
        for (const rule of rules) {
            const policy = new DynamicPolicy(rule);
            const targets = Array.isArray(rule.target_event_type) 
                ? rule.target_event_type 
                : [rule.target_event_type];
            
            for (const target of targets) {
                // Register/Overwrite policy for this target prefix
                // Note: This matches prefix logic. A rule target like "finance" will apply to "finance.transaction"
                this.register(target, policy);
            }
        }
        console.log(`[PolicyRegistry] Loaded ${rules.length} dynamic rules.`);
    }

    static getPolicy(eventType: string): Policy {
        // Simple prefix matching
        // e.g. "finance.transaction" matches "finance" registry
        // Priority: Longest prefix match could be better, but keeping simple first-match for now or strict map iteration order
        for (const [prefix, policy] of this.policies) {
            if (eventType.startsWith(prefix)) {
                return policy;
            }
        }
        return this.defaultPolicy;
    }

    /**
     * Aggregates risk from multiple policy results.
     * @param results Array of DecisionResult objects
     * @returns Aggregated score (0-100) and combined reasoning
     */
    static aggregateRisk(results: DecisionResult[]): { score: number, decision: string, reason: string } {
        let totalScore = 0;
        const reasons: string[] = [];
        let forceDeny = false;

        for (const res of results) {
            if (typeof res === 'string') {
                if (res === 'DENY') {
                    totalScore += 100;
                    forceDeny = true;
                    reasons.push('Explicit DENY');
                } else if (res === 'ESCALATE') {
                    totalScore += 50;
                    reasons.push('Explicit ESCALATE');
                }
            } else {
                totalScore += (res.score || 0);
                if (res.decision === 'DENY') forceDeny = true;
                if (res.reason) reasons.push(res.reason);
            }
        }

        // Cap at 100
        const finalScore = Math.min(100, totalScore);
        
        // Determine final decision based on score or explicit flags
        let decision = 'ALLOW';
        if (forceDeny || finalScore >= 80) decision = 'DENY';
        else if (finalScore >= 30) decision = 'ESCALATE';

        return {
            score: finalScore,
            decision,
            reason: reasons.join('; ') || 'Aggregated Risk Score'
        };
    }
}
