
import { LLMProvider } from './types';
import { GeminiProvider } from './gemini';

export class LLMFactory {
    static create(env: Record<string, string>): LLMProvider {
        const providerName = env.ABS_LLM_PROVIDER || 'gemini';

        switch (providerName) {
            case 'gemini':
                const keys = [
                    env.GEMINI_API_KEY,
                    env.GEMINI_API_KEY_2,
                    env.GEMINI_API_KEY_3,
                    env.GEMINI_API_KEY_4,
                    env.GEMINI_API_KEY_5,
                    env.GEMINI_API_KEY_6
                ].filter(Boolean) as string[];
                
                if (keys.length === 0) throw new Error('No GEMINI_API_KEY configured');
                return new GeminiProvider(keys);
            
            case 'openai':
                throw new Error('OpenAI Provider not yet implemented (Coming in v2.1)');
            
            case 'anthropic':
                throw new Error('Anthropic Provider not yet implemented (Coming in v2.1)');

            default:
                throw new Error(`Unknown LLM Provider: ${providerName}`);
        }
    }
}
