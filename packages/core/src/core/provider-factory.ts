/**
 * LLM Provider Factory
 * 
 * Factory pattern for instantiating AI providers based on configuration.
 * Supports mock (testing), OpenAI, and Gemini providers.
 */

import { MockProvider } from './providers/mock';
import { OpenAIProvider } from './providers/openai';
import { GeminiProvider } from './providers/gemini';

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

/**
 * Get an LLM provider instance based on type.
 * Falls back to MockProvider if type is unknown or config is missing.
 */
export function getProvider(type: ProviderType | string, config?: ProviderConfig): LLMProvider {
    switch (type) {
        case 'openai':
            if (!config?.apiKey) {
                console.warn('[Provider] OpenAI requested but no API key provided, falling back to mock');
                return new MockProvider();
            }
            return new OpenAIProvider(config);
        
        case 'gemini':
            if (!config?.apiKey) {
                console.warn('[Provider] Gemini requested but no API key provided, falling back to mock');
                return new MockProvider();
            }
            return new GeminiProvider(config);
        
        case 'mock':
        default:
            return new MockProvider();
    }
}
