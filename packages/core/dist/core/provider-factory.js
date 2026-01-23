"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProvider = getProvider;
const mock_1 = require("./providers/mock");
const openai_1 = require("./providers/openai");
const gemini_1 = require("./providers/gemini");
/**
 * Get an LLM provider instance based on type.
 * Falls back to MockProvider if type is unknown or config is missing.
 */
function getProvider(type, config) {
    let provider;
    switch (type) {
        case 'openai':
            if (!config?.apiKey) {
                console.warn('[Provider] OpenAI requested but no API key provided, falling back to mock');
                provider = new mock_1.MockProvider();
            }
            else {
                provider = new openai_1.OpenAIProvider(config);
            }
            break;
        case 'gemini':
            if (!config?.apiKey) {
                console.warn('[Provider] Gemini requested but no API key provided, falling back to mock');
                provider = new mock_1.MockProvider();
            }
            else {
                provider = new gemini_1.GeminiProvider(config);
            }
            break;
        case 'mock':
        default:
            provider = new mock_1.MockProvider();
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
