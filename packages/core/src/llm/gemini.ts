
import { LLMProvider, LLMRequest, LLMResponse } from './types';

export class GeminiProvider implements LLMProvider {
    name = 'gemini';
    private apiKeys: string[];

    constructor(apiKeys: string[]) {
        this.apiKeys = apiKeys;
    }

    private getRotatedKey(): string {
        return this.apiKeys[Math.floor(Math.random() * this.apiKeys.length)];
    }

    async generate(request: LLMRequest): Promise<LLMResponse> {
        const start = Date.now();
        const apiKey = this.getRotatedKey();
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${request.model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    role: 'user',
                    parts: [{ text: request.systemPrompt + "\n\n" + request.userPrompt }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        return {
            content,
            latencyMs: Date.now() - start
        };
    }
}
