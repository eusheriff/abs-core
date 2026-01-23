"use strict";
/**
 * Action Sanitizer - Reformulate risky actions instead of blocking
 *
 * Some actions are too risky to execute as-is but could be safe
 * with modifications. The sanitizer attempts to:
 * 1. Add safety constraints (LIMIT, WHERE clauses)
 * 2. Request confirmation for destructive ops
 * 3. Redact sensitive data from outputs
 *
 * This is different from prompt-sanitizer.ts which detects injection.
 * This module reformulates actions to make them safer.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionSanitizer = void 0;
exports.getActionSanitizer = getActionSanitizer;
// Built-in sanitization rules
const ACTION_SANITIZE_RULES = [
    {
        name: 'sql-add-limit',
        eventType: /^db:(query|execute)$/,
        check: (payload) => {
            const query = String(payload.query || '').toUpperCase();
            return (query.includes('DELETE') ||
                query.includes('UPDATE') ||
                query.includes('SELECT')) && !query.includes('LIMIT') && !query.includes('WHERE');
        },
        sanitize: (payload) => {
            const originalQuery = String(payload.query || '');
            const upperQuery = originalQuery.toUpperCase().trim();
            if (upperQuery.startsWith('DELETE') || upperQuery.startsWith('UPDATE')) {
                return {
                    canSanitize: true,
                    originalAction: originalQuery,
                    sanitizedAction: originalQuery + ' LIMIT 1',
                    changes: ['Added LIMIT 1 to prevent mass operation'],
                    requiresConfirmation: true,
                    reason: 'Destructive operation without WHERE clause',
                };
            }
            if (upperQuery.startsWith('SELECT') && !upperQuery.includes('LIMIT')) {
                return {
                    canSanitize: true,
                    originalAction: originalQuery,
                    sanitizedAction: originalQuery + ' LIMIT 100',
                    changes: ['Added LIMIT 100 to prevent large result sets'],
                    requiresConfirmation: false,
                };
            }
            return {
                canSanitize: false,
                originalAction: originalQuery,
                sanitizedAction: originalQuery,
                changes: [],
                requiresConfirmation: false,
            };
        },
    },
    {
        name: 'shell-remove-dangerous-flags',
        eventType: /^shell:(execute|run)$/,
        check: (payload) => {
            const command = String(payload.command || '');
            return command.includes('rm ') && command.includes('-rf');
        },
        sanitize: (payload) => {
            const originalCommand = String(payload.command || '');
            // Remove -rf flags, add -i for interactive
            const sanitizedCommand = originalCommand
                .replace(/-rf\s*/g, '-i ')
                .replace(/-r\s+-f\s*/g, '-i ')
                .replace(/-f\s+-r\s*/g, '-i ');
            return {
                canSanitize: true,
                originalAction: originalCommand,
                sanitizedAction: sanitizedCommand,
                changes: ['Replaced -rf with -i (interactive mode)'],
                requiresConfirmation: true,
                reason: 'Destructive shell command modified for safety',
            };
        },
    },
    {
        name: 'redact-secrets-in-output',
        eventType: /^(log|output|response):/,
        check: (payload) => {
            const content = String(payload.content || payload.message || '');
            const secretPatterns = [
                /api[_-]?key\s*[:=]\s*["']?[a-zA-Z0-9]{20,}/i,
                /sk[-_](live|test)[-_][a-zA-Z0-9]{20,}/,
                /ghp_[a-zA-Z0-9]{36}/,
                /password\s*[:=]\s*["']?[^\s"']{8,}/i,
            ];
            return secretPatterns.some(p => p.test(content));
        },
        sanitize: (payload) => {
            const originalContent = String(payload.content || payload.message || '');
            const sanitizedContent = originalContent
                .replace(/api[_-]?key\s*[:=]\s*["']?[a-zA-Z0-9]{20,}/gi, 'API_KEY=[REDACTED]')
                .replace(/sk[-_](live|test)[-_][a-zA-Z0-9]{20,}/g, 'sk-[REDACTED]')
                .replace(/ghp_[a-zA-Z0-9]{36}/g, 'ghp_[REDACTED]')
                .replace(/password\s*[:=]\s*["']?[^\s"']{8,}/gi, 'password=[REDACTED]');
            return {
                canSanitize: true,
                originalAction: '[content with secrets]',
                sanitizedAction: sanitizedContent,
                changes: ['Redacted potential secrets from output'],
                requiresConfirmation: false,
                reason: 'Sensitive data detected and redacted',
            };
        },
    },
];
class ActionSanitizer {
    constructor(customRules = []) {
        this.rules = [...ACTION_SANITIZE_RULES, ...customRules];
    }
    /**
     * Attempt to sanitize an action
     */
    trySanitize(eventType, payload) {
        for (const rule of this.rules) {
            const typeMatch = typeof rule.eventType === 'string'
                ? eventType === rule.eventType
                : rule.eventType.test(eventType);
            if (typeMatch && rule.check(payload)) {
                const result = rule.sanitize(payload);
                if (result.canSanitize) {
                    console.log(`[ActionSanitizer] Applied rule '${rule.name}' to ${eventType}`);
                    return result;
                }
            }
        }
        return null; // No applicable sanitization
    }
    /**
     * Add a custom rule
     */
    addRule(rule) {
        this.rules.push(rule);
    }
    /**
     * Get all rules
     */
    getRules() {
        return [...this.rules];
    }
}
exports.ActionSanitizer = ActionSanitizer;
// Singleton instance
let instance = null;
function getActionSanitizer(customRules) {
    if (!instance) {
        instance = new ActionSanitizer(customRules);
    }
    return instance;
}
exports.default = ActionSanitizer;
