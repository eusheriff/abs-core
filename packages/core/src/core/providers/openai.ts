/**
 * OpenAI LLM Provider
 * 
 * Uses GPT-4o-mini for cost-effective decision proposals.
 * Requires OPENAI_API_KEY secret in Cloudflare.
 */

import { LLMProvider, PartialProposal, ProviderConfig } from '../interfaces';
import { PromptSanitizer } from '../sanitizer';

const DECISION_PROMPT = `You are an autonomous business decision agent. Analyze the incoming event and propose an action.

Your response MUST be a valid JSON object with exactly this structure:
{
  "recommended_action": "approve" | "deny" | "escalate" | "defer" | "log_info",
  "action_params": { /* optional parameters for the action */ },
  "explanation": {
    "summary": "Brief one-line summary",
    "rationale": "Detailed reasoning for this decision",
    "evidence_refs": ["optional", "references"]
  },
  "confidence": 0.0 to 1.0,
  "risk_level": "low" | "medium" | "high" | "critical"
}

Be conservative. When in doubt, escalate. Never approve high-risk actions without explicit evidence.`;

export class OpenAIProvider implements LLMProvider {
    name = 'openai';
    private apiKey: string;
    private model: string;
    private maxTokens: number;
    private temperature: number;

    constructor(config: ProviderConfig) {
        this.apiKey = config.apiKey || '';
        this.model = config.model || 'gpt-4o-mini';
        this.maxTokens = config.maxTokens || 1024;
        this.temperature = config.temperature || 0.3;
    }

    async propose(event: unknown): Promise<PartialProposal> {
        // Security: Check for prompt injection before processing
        const { flagged, flags } = PromptSanitizer.sanitize(event);
        if (flagged) {
            console.warn('[OpenAI] Prompt injection detected, auto-escalating:', flags);
            return {
                recommended_action: 'escalate',
                action_params: { security_flags: flags, reason: 'prompt_injection_detected' },
                explanation: {
                    summary: 'Auto-escalated: potential prompt injection detected',
                    rationale: `Suspicious patterns found in event payload: ${flags.join('; ')}`,
                    evidence_refs: []
                },
                confidence: 0.0,
                risk_level: 'critical'
            };
        }

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: DECISION_PROMPT },
                        { role: 'user', content: JSON.stringify(event, null, 2) }
                    ],
                    response_format: { type: 'json_object' },
                    max_tokens: this.maxTokens,
                    temperature: this.temperature
                })
            });

            if (!response.ok) {
                const error = await response.text();
                console.error('[OpenAI] API Error:', error);
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json() as { 
                choices: Array<{ message: { content: string } }> 
            };
            
            const content = data.choices?.[0]?.message?.content;
            if (!content) {
                throw new Error('No content in OpenAI response');
            }

            const proposal = JSON.parse(content) as PartialProposal;
            
            // Validate and sanitize
            return this.validateProposal(proposal);

        } catch (error) {
            console.error('[OpenAI] Propose failed:', error);
            // Return safe fallback on any error
            return {
                recommended_action: 'escalate',
                action_params: { reason: 'LLM error' },
                explanation: {
                    summary: 'Escalated due to LLM processing error',
                    rationale: `Unable to process with OpenAI: ${error}`,
                    evidence_refs: []
                },
                confidence: 0.1,
                risk_level: 'medium'
            };
        }
    }

    private validateProposal(proposal: Partial<PartialProposal>): PartialProposal {
        const validActions = ['approve', 'deny', 'escalate', 'defer', 'log_info'];
        const validRiskLevels = ['low', 'medium', 'high', 'critical'];

        return {
            recommended_action: validActions.includes(proposal.recommended_action || '') 
                ? proposal.recommended_action! 
                : 'escalate',
            action_params: proposal.action_params || {},
            explanation: {
                summary: proposal.explanation?.summary || 'No summary provided',
                rationale: proposal.explanation?.rationale || 'No rationale provided',
                evidence_refs: proposal.explanation?.evidence_refs || []
            },
            confidence: typeof proposal.confidence === 'number' 
                ? Math.max(0, Math.min(1, proposal.confidence)) 
                : 0.5,
            risk_level: validRiskLevels.includes(proposal.risk_level || '') 
                ? proposal.risk_level as PartialProposal['risk_level']
                : 'medium'
        };
    }
}
