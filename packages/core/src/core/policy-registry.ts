import { PolicyEngine } from './interfaces';
import { SimplePolicyEngine } from './policy';
import { BotOperationalPolicy } from './policy-bot-operational';
import { WhatsAppBotPolicy } from './policy-whatsapp-bot';
import { DynamicPolicy } from './dynamic-policy';
import { PolicyRule } from './schemas/policy-definition';

// Re-export types for convenience
export type { PolicyEngine, PolicyResult } from './interfaces';

// Define DecisionResult compatibility type if not in interfaces
export type DecisionResult = string | { decision: string; reason?: string };

export interface Policy {
    name?: string;
    description?: string;
    evaluate(proposal: any, event: any): DecisionResult;
}

export class PolicyRegistry {
    private static policies: Map<string, Policy> = new Map();
    private static defaultPolicy: Policy = new SimplePolicyEngine() as any;

    // Initialize with policies for different event types
    static {
        // WhatsApp-specific policy (more detailed, 6 rules)
        this.register('whatsapp', new WhatsAppBotPolicy() as unknown as Policy);
        // Generic bot policy (5 rules)
        this.register('bot', new BotOperationalPolicy() as any);
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
}
