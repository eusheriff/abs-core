import { PolicyEngine, PolicyResult } from './interfaces';
import { SimplePolicyEngine } from './policy';
import { BotOperationalPolicy } from './policy-bot-operational';
import { DecisionProposal } from './schemas';

export class PolicyRegistry {
    private static policies: Map<string, PolicyEngine> = new Map();
    private static defaultPolicy: PolicyEngine = new SimplePolicyEngine();

    // Initialize with bot operational policy for whatsapp events
    static {
        this.register('whatsapp', new BotOperationalPolicy());
        this.register('bot', new BotOperationalPolicy());
    }

    static register(eventTypePrefix: string, policy: PolicyEngine) {
        this.policies.set(eventTypePrefix, policy);
    }

    static getPolicy(eventType: string): PolicyEngine {
        // Simple prefix matching
        // e.g. "finance.transaction" matches "finance" registry
        for (const [prefix, policy] of this.policies) {
            if (eventType.startsWith(prefix)) {
                return policy;
            }
        }
        return this.defaultPolicy;
    }
}
