"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIDecisionProvider = void 0;
const openai_1 = __importDefault(require("openai"));
class OpenAIDecisionProvider {
    constructor(apiKey) {
        this.client = null;
        this.apiKey = apiKey;
        if (apiKey && apiKey !== 'sk-placeholder') {
            try {
                this.client = new openai_1.default({ apiKey });
            }
            catch (e) {
                console.error('Failed to initialize OpenAI client:', e);
            }
        }
    }
    async propose(context, currentState) {
        // 1. Mock Mode Check
        if (!this.client || this.apiKey === 'sk-placeholder') {
            console.log('⚠️ Using OpenAI Mock (Placeholder Key or Client Init Failed)');
            return {
                recommended_action: 'mock_action',
                confidence: 0.99,
                explanation: {
                    summary: 'Mocked response',
                    rationale: 'API Key not provided or Invalid',
                    evidence_refs: []
                }
            };
        }
        const systemPrompt = `
      You are the Decision Engine of an Autonomous Business System.
      Current State: ${currentState}
      Context: ${JSON.stringify(context)}
      
      Suggest the next best action.
      Output strictly JSON matching the DecisionProposal schema.
      Do NOT hallucinate facts not present in context.
    `;
        // Real API Call
        try {
            const response = await this.client.chat.completions.create({
                model: 'gpt-3.5-turbo-0125',
                messages: [{ role: 'system', content: systemPrompt }],
                response_format: { type: 'json_object' }
            });
            const content = response.choices[0].message.content;
            if (!content)
                throw new Error('Empty response from LLM');
            return JSON.parse(content);
        }
        catch (error) {
            console.error('OpenAI API Error:', error);
            // Fallback to mock on error to avoid 500 in demo
            return {
                recommended_action: 'error_fallback_action',
                confidence: 0,
                explanation: { summary: 'Error calling LLM', rationale: error.message, evidence_refs: [] }
            };
        }
    }
}
exports.OpenAIDecisionProvider = OpenAIDecisionProvider;
