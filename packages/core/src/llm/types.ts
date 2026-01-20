
export interface LLMRequest {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    model?: string;
}

export interface LLMResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    latencyMs?: number;
}

export interface LLMProvider {
    generate(request: LLMRequest): Promise<LLMResponse>;
    name: string;
}
