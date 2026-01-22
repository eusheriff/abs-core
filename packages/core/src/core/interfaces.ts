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

// --- ADR-008 Types (Re-exported from Schema) ---
export type { Verdict, DecisionType, ReasonCode, DecisionEnvelope } from './schemas';

// Policy Engine Interface (v2)
export interface PolicyEngine {
    // evaluate now returns a PARTIAL envelope (Framework fills ID, Signature, Timestamp)
    evaluate(proposal: DecisionProposal, event: any): any; // Relaxed to any to support mixed returns during migration
}

// Legacy Compat (Deprecated)
// Keeping simple PolicyResult for now to avoid breaking imports immediately, 
// will map to Verdict inside implementation.
export type LegacyPolicyResult = 'ALLOW' | 'DENY' | 'MANUAL_REVIEW';

export type DecisionResult = string | { 
    decision: string; 
    reason?: string; 
    score?: number;
    domain?: string;
    tags?: string[];
};

export interface Policy {
    name?: string;
    description?: string;
    evaluate(proposal: any, event: any): DecisionResult;
}
