import { GoogleGenerativeAI } from '@google/generative-ai';
import { DecisionProvider } from './openai'; // Reusing interface
import { DecisionProposal } from '../core/schemas';

export class GeminiDecisionProvider implements DecisionProvider {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async propose(context: any, currentState: string): Promise<Partial<DecisionProposal>> {
    const prompt = `
      You are the Decision Engine of an Autonomous Business System.
      Current State: ${currentState}
      Context: ${JSON.stringify(context)}
      
      Suggest the next best action.
      Output strictly JSON matching the DecisionProposal schema.
      Do NOT hallucinate facts not present in context.
      Make sure to return valid JSON wrapped in curly braces.
    `;

    try {
        const result = await this.model.generateContent(prompt);
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
