"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyRegistry = void 0;
const policy_1 = require("./policy");
const policy_bot_operational_1 = require("./policy-bot-operational");
const policy_whatsapp_bot_1 = require("./policy-whatsapp-bot");
const dynamic_policy_1 = require("./dynamic-policy");
class PolicyRegistry {
    static register(eventTypePrefix, policy) {
        this.policies.set(eventTypePrefix, policy);
        console.log(`[PolicyRegistry] Registered policy for prefix '${eventTypePrefix}': ${policy.name || 'Unnamed'}`);
    }
    static loadRules(rules) {
        for (const rule of rules) {
            const policy = new dynamic_policy_1.DynamicPolicy(rule);
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
    static getPolicy(eventType) {
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
    static aggregateRisk(results) {
        let totalScore = 0;
        const reasons = [];
        let forceDeny = false;
        for (const res of results) {
            if (typeof res === 'string') {
                if (res === 'DENY') {
                    totalScore += 100;
                    forceDeny = true;
                    reasons.push('Explicit DENY');
                }
                else if (res === 'ESCALATE') {
                    totalScore += 50;
                    reasons.push('Explicit ESCALATE');
                }
            }
            else {
                totalScore += (res.score || 0);
                if (res.decision === 'DENY')
                    forceDeny = true;
                if (res.reason)
                    reasons.push(res.reason);
            }
        }
        // Cap at 100
        const finalScore = Math.min(100, totalScore);
        // Determine final decision based on score or explicit flags
        let decision = 'ALLOW';
        if (forceDeny || finalScore >= 80)
            decision = 'DENY';
        else if (finalScore >= 30)
            decision = 'ESCALATE';
        return {
            score: finalScore,
            decision,
            reason: reasons.join('; ') || 'Aggregated Risk Score'
        };
    }
}
exports.PolicyRegistry = PolicyRegistry;
_a = PolicyRegistry;
PolicyRegistry.policies = new Map();
PolicyRegistry.defaultPolicy = new policy_1.SimplePolicyEngine();
// Initialize with policies for different event types
(() => {
    // WhatsApp-specific policy (more detailed, 6 rules)
    _a.register('whatsapp', new policy_whatsapp_bot_1.WhatsAppBotPolicy());
    // Generic bot policy (5 rules)
    _a.register('bot', new policy_bot_operational_1.BotOperationalPolicy());
})();
