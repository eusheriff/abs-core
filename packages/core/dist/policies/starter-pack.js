"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RUNTIME_PAID_POLICIES = exports.FREE_TIER_POLICIES = void 0;
/**
 * SCANNER FREE TIER (Scanner Mode)
 * - Focada em detecção de padrões estáticos e regex.
 * - Baixo custo computacional.
 * - Objetiva: "Isso parece um segredo/PII?"
 */
exports.FREE_TIER_POLICIES = [
    {
        name: 'pii-scanner-basic',
        description: 'Detects basic PII patterns (Email, CPF, Credit Card) using Regex.',
        evaluate: (proposal, event) => {
            const payload = JSON.stringify(event.payload);
            // Simple Regex for Credit Card (Luhn algo not included for speed)
            if (/\b(?:\d[ -]*?){13,16}\b/.test(payload))
                return 'DENY';
            // Simple Regex for CPF
            if (/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/.test(payload))
                return 'DENY';
            return 'ALLOW';
        }
    },
    {
        name: 'keyword-blocklist',
        description: 'Blocks specific sensitive keywords (e.g., "password", "secret").',
        evaluate: (proposal, event) => {
            const payload = JSON.stringify(event.payload).toLowerCase();
            if (payload.includes('password') || payload.includes('secret_key'))
                return 'DENY';
            return 'ALLOW';
        }
    }
];
/**
 * RUNTIME PAID TIER (Runtime Mode)
 * - Focada em heurísticas avançadas, contexto de negócio e LLM.
 * - Alto valor agregado.
 * - Subjetiva/Contextual: "Essa transferência foge do padrão deste usuário?"
 */
exports.RUNTIME_PAID_POLICIES = [
    {
        name: 'velocity-check-advanced',
        description: 'Detects abnormal transaction velocity based on user history (Requires State).',
        evaluate: (proposal, event) => {
            // Placeholder: In real implementation, this would query a KV/D1 state
            if (event.payload && event.payload.amount > 10000) {
                return {
                    decision: 'ESCALATE', // Paid features support Escalation
                    reason: 'High value transaction requires manual approval'
                };
            }
            return 'ALLOW';
        }
    },
    {
        name: 'contextual-anomaly-detection',
        description: 'Uses LLM to detect semantic anomalies in user behavior.',
        evaluate: (proposal, event) => {
            // Leverages the high-confidence LLM proposal
            if (proposal.risk_level === 'high' && proposal.confidence > 0.8) {
                return 'DENY';
            }
            return 'ALLOW';
        }
    }
];
