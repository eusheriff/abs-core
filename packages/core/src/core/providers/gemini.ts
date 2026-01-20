/**
 * Gemini LLM Provider with Key Rotation
 * 
 * Uses Gemini 1.5 Flash with round-robin key rotation.
 * Supports multiple API keys for load distribution.
 */

import { LLMProvider, PartialProposal, ProviderConfig } from '../provider-factory';
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

// Round-robin counter (persists across requests in same isolate)
let keyIndex = 0;

export class GeminiProvider implements LLMProvider {
    name = 'gemini';
    private apiKeys: string[];
    private model: string;

    constructor(config: ProviderConfig) {
        // Support multiple keys separated by comma
        const keyString = config.apiKey || '';
        this.apiKeys = keyString.split(',').map(k => k.trim()).filter(k => k.length > 0);
        this.model = config.model || 'gemini-1.5-flash';
        
        console.log(`[Gemini] Initialized with ${this.apiKeys.length} API key(s) in rotation`);
    }

    private getNextKey(): string {
        if (this.apiKeys.length === 0) {
            throw new Error('No Gemini API keys configured');
        }
        
        const key = this.apiKeys[keyIndex % this.apiKeys.length];
        const keyLabel = `Key ${(keyIndex % this.apiKeys.length) + 1}/${this.apiKeys.length}`;
        keyIndex++;
        
        console.log(`[Gemini] Using ${keyLabel} (rotation index: ${keyIndex})`);
        return key;
    }

    async propose(event: unknown): Promise<PartialProposal> {
        // Security: Check for prompt injection before processing
        const { flagged, flags } = PromptSanitizer.sanitize(event);
        if (flagged) {
            console.warn('[Gemini] Prompt injection detected, auto-escalating:', flags);
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

        const apiKey = this.getNextKey();
        
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${apiKey}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: DECISION_PROMPT },
                                { text: `\n\nEvent to analyze:\n${JSON.stringify(event, null, 2)}` }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 1024,
                        responseMimeType: 'application/json'
                    }
                })
            });

            if (!response.ok) {
                const error = await response.text();
                console.error('[Gemini] API Error:', error);
                
                // If rate limited or quota exceeded, try next key
                if (response.status === 429 || response.status === 403) {
                    console.warn('[Gemini] Rate limit hit, will use next key on retry');
                }
                
                throw new Error(`Gemini API error: ${response.status}`);
            }

            const data = await response.json() as {
                candidates: Array<{ content: { parts: Array<{ text: string }> } }>
            };
            
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!content) {
                throw new Error('No content in Gemini response');
            }

            // Gemini may wrap JSON in markdown code blocks
            const jsonContent = content.replace(/```json\n?|\n?```/g, '').trim();
            const proposal = JSON.parse(jsonContent) as PartialProposal;
            
            return this.validateProposal(proposal);

        } catch (error) {
            console.error('[Gemini] Propose failed:', error);
            return {
                recommended_action: 'escalate',
                action_params: { reason: 'LLM error' },
                explanation: {
                    summary: 'Escalated due to LLM processing error',
                    rationale: `Unable to process with Gemini: ${error}`,
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
