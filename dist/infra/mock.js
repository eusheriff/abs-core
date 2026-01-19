"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockDecisionProvider = void 0;
class MockDecisionProvider {
    async propose(event, currentState) {
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
exports.MockDecisionProvider = MockDecisionProvider;
