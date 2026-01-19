import { GoogleGenerativeAI } from '@google/generative-ai';
import { DecisionProvider } from './openai'; // Reusing interface
import { DecisionProposal } from '../core/schemas';

export class GeminiDecisionProvider implements DecisionProvider {
  private apiKeys: string[];

  constructor(apiKeys: string[]) {
    this.apiKeys = apiKeys.filter(k => k.trim().length > 0);
    if (this.apiKeys.length === 0) {
        console.warn('⚠️ No Gemini keys provided. Provider will fail if called.');
    } else {
        console.log(`♊️ Gemini Provider initialized with ${this.apiKeys.length} keys.`);
    }
  }

  private getClient(): GoogleGenerativeAI {
      // Random Load Balancing
      const randomIndex = Math.floor(Math.random() * this.apiKeys.length);
      const selectedKey = this.apiKeys[randomIndex];
      // console.log(`🔑 Using Key #${randomIndex + 1}`); // Debug only
      return new GoogleGenerativeAI(selectedKey);
  }

  async propose(context: any, currentState: string): Promise<Partial<DecisionProposal>> {
    if (this.apiKeys.length === 0) {
        return { 
            recommended_action: 'error_no_keys', 
            confidence: 0,
            explanation: { summary: 'Configuration Error', rationale: 'No API keys available', evidence_refs: [] }
        };
    }

    const genAI = this.getClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const safeContext = JSON.stringify(context).replace(/`/g, "'");
    const safeState = currentState.replace(/`/g, "'");

    const prompt = `
      You are the Decision Engine of an Autonomous Business System.
      
      <current_state>
      ${safeState}
      </current_state>

      <context>
      ${safeContext}
      </context>
      
      Suggest the next best action.
      Output strictly JSON matching the DecisionProposal schema.
      Do NOT hallucinate facts not present in context.
      Make sure to return valid JSON wrapped in curly braces.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Gemini sometimes wraps JSON in markdown blocks like ```json ... ```
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return JSON.parse(cleanedText);
    } catch (error: any) {
        console.error('Gemini API Error:', error);
        return {
             recommended_action: 'error_fallback_action',
             confidence: 0,
             explanation: { summary: 'Error calling Gemini', rationale: error.message, evidence_refs: [] }
        };
    }
  }
}
