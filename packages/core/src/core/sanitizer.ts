/**
 * Prompt Sanitizer
 * 
 * Detects and flags potential prompt injection attempts in event payloads.
 * When flagged, calls should auto-escalate rather than process with LLM.
 */

export interface SanitizationResult {
    clean: unknown;
    flagged: boolean;
    flags: string[];
}

// Patterns that could manipulate LLM behavior
const INJECTION_PATTERNS: readonly RegExp[] = [
    // Direct instruction override attempts
    /ignore\s+(all\s+)?(previous|above|prior|my|the)\s+(instructions?|rules?|prompts?)/i,
    /disregard\s+(all\s+)?(previous|above|prior)?/i,
    /forget\s+(all\s+)?(previous|above|prior|your)\s+(instructions?|rules?)/i,
    
    // Role/persona hijacking
    /you\s+are\s+now\s+/i,
    /act\s+as\s+(if\s+)?/i,
    /pretend\s+(to\s+be|you'?re)/i,
    /roleplay\s+as/i,
    /imagine\s+you\s+are/i,
    
    // System prompt injection
    /system\s*:\s*/i,
    /\[system\]/i,
    /\[INST\]/i,
    /<<SYS>>/i,
    /<\|im_start\|>/i,
    /<\|.*\|>/,  // Generic special tokens
    
    // Jailbreak patterns
    /do\s+anything\s+now/i,
    /DAN\s+mode/i,
    /jailbreak/i,
    /bypass\s+(the\s+)?(filter|restriction|rule)/i,
    
    // Output manipulation
    /always\s+(respond|answer|say|output)/i,
    /your\s+(only\s+)?response\s+(should|must|will)\s+be/i,
    /respond\s+with\s+(only\s+)?["'`]/i,
    
    // Direct action override
    /\bapprove\s+this\b/i,
    /\bmust\s+approve\b/i,
    /\bforce\s+approval\b/i,
];

/**
 * Sanitize input and detect potential prompt injection.
 * 
 * @param input - The event payload to check
 * @returns SanitizationResult with flagged status and matched patterns
 */
export function sanitize(input: unknown): SanitizationResult {
    const stringified = JSON.stringify(input);
    const flags: string[] = [];
    
    for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(stringified)) {
            // Extract matched text for logging
            const match = stringified.match(pattern);
            flags.push(`Pattern: "${pattern.source}" matched: "${match?.[0] || 'unknown'}"`);
        }
    }
    
    if (flags.length > 0) {
        console.warn('[Sanitizer] Potential prompt injection detected:', flags);
    }
    
    return {
        clean: input,  // Pass through for now (could scrub in future)
        flagged: flags.length > 0,
        flags
    };
}

/**
 * PromptSanitizer class for object-oriented usage
 */
export class PromptSanitizer {
    static sanitize = sanitize;
    
    static isSafe(input: unknown): boolean {
        return !sanitize(input).flagged;
    }
}
