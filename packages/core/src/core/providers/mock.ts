/**
 * Mock LLM Provider
 * 
 * Returns predetermined responses for testing and development.
 * No external API calls.
 */

import { LLMProvider, PartialProposal } from '../interfaces';

export class MockProvider implements LLMProvider {
    name = 'mock';

    async propose(event: unknown): Promise<PartialProposal> {
        // Simulate async processing
        await new Promise(resolve => setTimeout(resolve, 10));
        
        return {
            recommended_action: 'approve',
            action_params: {},
            explanation: {
                summary: 'Auto-approved by Mock Provider',
                rationale: 'This is a mock response for development/testing. In production, use a real LLM provider.',
                evidence_refs: []
            },
            confidence: 0.99,
            risk_level: 'low'
        };
    }
}
