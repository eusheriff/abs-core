import { DecisionProposal } from './schemas';

// --- LLM Provider Interfaces ---

export type ProviderType = 'mock' | 'openai' | 'gemini';

export interface PartialProposal {
    recommended_action: string;
    action_params?: Record<string, unknown>;
    explanation: {
        summary: string;
        rationale: string;
        evidence_refs?: string[];
    };
    confidence: number;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
}

export interface ProviderConfig {
    apiKey?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
}

export interface LLMProvider {
    name: string;
    propose(event: unknown, context?: unknown): Promise<PartialProposal>;
}

// --- Legacy / Policy Interfaces ---

export interface DecisionProvider {
    propose(payload: Record<string, unknown>, currentState: string): Promise<Partial<DecisionProposal>>;
}

export type PolicyResult = 'ALLOW' | 'DENY' | 'MANUAL_REVIEW';

export interface PolicyEngine {
    evaluate(proposal: DecisionProposal, event: any): PolicyResult;
}
