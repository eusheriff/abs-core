import { MockProvider } from './providers/mock';
import { OpenAIProvider } from './providers/openai';
import { GeminiProvider } from './providers/gemini';
// import { VCRProvider } from './vcr-provider';
import { LLMProvider, ProviderType, ProviderConfig } from './interfaces';

// Re-export types for convenience if needed, or consumers should use interfaces
export type { LLMProvider, ProviderType, ProviderConfig };

/**
 * Get an LLM provider instance based on type.
 * Falls back to MockProvider if type is unknown or config is missing.
 */
export function getProvider(type: ProviderType | string, config?: ProviderConfig): LLMProvider {
    let provider: LLMProvider;

    switch (type) {
        case 'openai':
            if (!config?.apiKey) {
                console.warn('[Provider] OpenAI requested but no API key provided, falling back to mock');
                provider = new MockProvider();
            } else {
                provider = new OpenAIProvider(config);
            }
            break;
        
        case 'gemini':
            if (!config?.apiKey) {
                console.warn('[Provider] Gemini requested but no API key provided, falling back to mock');
                provider = new MockProvider();
            } else {
                provider = new GeminiProvider(config);
            }
            break;
        
        case 'mock':
        default:
            provider = new MockProvider();
            break;
    }

    /*
    // VCR Logic disabled for Edge Worker compatibility (FS dependency)
    // TODO: Re-enable via dynamic import for testing scenarios only
    const vcrMode = typeof process !== 'undefined' ? process.env?.ABS_VCR_MODE : undefined;

    if (vcrMode && vcrMode !== 'off') {
        const mode = vcrMode === 'record' || vcrMode === 'replay' ? vcrMode : 'off';
        if (mode !== 'off') {
            console.log(`[Provider] Wrapping ${provider.name} in VCR (mode=${mode})`);
            // return new VCRProvider(provider, mode);
        }
    }
    */

    return provider;
}
