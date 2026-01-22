import { DecisionProposal } from './schemas';
import { PolicyEngine, PolicyResult } from './interfaces';

export class SimplePolicyEngine implements PolicyEngine {
    name = 'SimplePolicy';
    
    evaluate(proposal: DecisionProposal, context: any): any {
        // Invariant: Automatic execution only for High Confidence + Low Risk
        if (proposal.confidence < 0.8) {
            console.log(`🛡️ Policy: DENY (Low Confidence: ${proposal.confidence})`);
            return {
                verdict: 'REQUIRE_APPROVAL',
                reason_code: 'POLICY.VIOLATION',
                reason_human: `Confidence ${proposal.confidence} is below threshold 0.8`,
                risk_score: 60,
                required_checks: ['POLICY_ACTIVE']
            };
        }

        // Whitelist of allowed automatic actions for v0.5
        const ALLOWED_AUTO_ACTIONS = ['send_email', 'update_crm', 'notify_slack', 'log_info'];
        
        if (!ALLOWED_AUTO_ACTIONS.includes(proposal.recommended_action)) {
             console.log(`🛡️ Policy: DENY (Action '${proposal.recommended_action}' not in whitelist)`);
             return {
                 verdict: 'DENY',
                 reason_code: 'POLICY.VIOLATION',
                 reason_human: `Action '${proposal.recommended_action}' is not whitelisted.`,
                 risk_score: 100,
                 required_checks: ['POLICY_ACTIVE']
             };
        }

        console.log(`🛡️ Policy: ALLOW (${proposal.recommended_action})`);
        return {
            verdict: 'ALLOW',
            reason_code: 'OPS.MAINTENANCE', // Benign
            reason_human: `Confidence ${proposal.confidence} and Whitelisted Action.`,
            risk_score: 0,
            required_checks: ['POLICY_ACTIVE', 'TENANT_ACTIVE']
        };
    }
}
