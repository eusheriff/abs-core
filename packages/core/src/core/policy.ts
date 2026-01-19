import { DecisionProposal } from './schemas';
import { PolicyEngine, PolicyResult } from './interfaces';

export class SimplePolicyEngine implements PolicyEngine {
    evaluate(proposal: DecisionProposal, context: any): PolicyResult {
        // Invariant: Automatic execution only for High Confidence + Low Risk
        if (proposal.confidence < 0.8) {
            console.log(`🛡️ Policy: DENY (Low Confidence: ${proposal.confidence})`);
            return 'MANUAL_REVIEW';
        }

        // Whitelist of allowed automatic actions for v0.5
        const ALLOWED_AUTO_ACTIONS = ['send_email', 'update_crm', 'notify_slack', 'log_info'];
        
        if (!ALLOWED_AUTO_ACTIONS.includes(proposal.recommended_action)) {
             console.log(`🛡️ Policy: DENY (Action '${proposal.recommended_action}' not in whitelist)`);
             return 'MANUAL_REVIEW';
        }

        console.log(`🛡️ Policy: ALLOW (${proposal.recommended_action})`);
        return 'ALLOW';
    }
}
