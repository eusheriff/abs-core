import { DecisionProvider } from '../core/types';
import { DecisionProposal } from '../core/schemas';

export class MockDecisionProvider implements DecisionProvider {
    async propose(event: any, currentState: string): Promise<DecisionProposal> {
        console.log('🤖 MockProvider: Generating deterministic proposal...');
        
        // Deterministic logic for QuickStart demo
        const isSales = event.payload?.text?.toLowerCase().includes('enterprise');
        
        return {
            recommended_action: isSales ? 'notify_sales' : 'log_info',
            confidence: 0.95,
            explanation: {
                summary: 'Deterministic Mock Decision',
                rationale: isSales ? 'Keyword "enterprise" detected' : 'Standard event logging',
                evidence_refs: ['mock_rule_01']
            }
        };
    }
}
