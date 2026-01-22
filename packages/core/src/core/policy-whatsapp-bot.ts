/**
 * WhatsApp Bot Governance Policy
 * 
 * 6 policies for governing WhatsApp bot actions:
 * - WB-01: Business hours check
 * - WB-02: Commercial promise detection
 * - WB-03: Low confidence block
 * - WB-04: High discount escalation
 * - WB-05: VIP customer override
 * - WB-06: Spam protection
 */

import { DecisionProposal } from './schemas';

export interface BotContext {
    timestamp: string;
    confidence_score: number;
    is_business_hours: boolean;
    customer_tier: 'regular' | 'vip' | 'enterprise';
    daily_interactions: number;
    has_pending_order: boolean;
}

export interface BotContent {
    message?: string;
    discount_percent?: number;
    ticket_priority?: 'low' | 'medium' | 'high';
}

export interface BotActionPayload {
    action: 'send_message' | 'create_ticket' | 'apply_discount' | 'handoff_human';
    conversation: {
        customer_phone: string;
        channel: 'whatsapp' | 'instagram' | 'telegram';
        started_at: string;
        message_count: number;
        last_intent: string;
    };
    content: BotContent;
    context: BotContext;
}

export interface PolicyResult {
    decision: 'allow' | 'deny' | 'escalate' | 'handoff';
    reason: string;
    policy_id: string;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    allowed_modifications?: {
        max_discount?: number;
        restricted_topics?: string[];
    };
}

// Commercial keywords that trigger handoff
const COMMERCIAL_PATTERNS = [
    /desconto\s+de?\s*\d+%/i,
    /preço\s+(especial|promocional)/i,
    /garantia\s+(estendida|vitalícia)/i,
    /frete\s+gr[áa]tis/i,
    /parcelamento\s+sem\s+juros/i,
    /oferta\s+(exclusiva|especial)/i,
    /promoção/i,
    /cashback/i
];

export class WhatsAppBotPolicy {
    name = 'WhatsAppBotPolicy';
    
    evaluate(event: { payload?: BotActionPayload }, proposal: DecisionProposal): any {
        const payload = event?.payload;
        
        // Safe guard: if payload doesn't match expected structure, fall back to LLM proposal
        if (!payload || !payload.context) {
            console.log('[WhatsAppBotPolicy] Payload não segue schema esperado, usando proposta do LLM');
            return {
                verdict: 'REQUIRE_APPROVAL',
                reason_code: 'INPUT.MALFORMED',
                reason_human: proposal.explanation?.summary || 'Payload não segue schema WhatsApp',
                risk_score: 50,
                authority: { type: 'POLICY', id: 'WB-FALLBACK' }
            };
        }
        
        const { context, content, action } = payload;
        
        // WB-01: Business hours check
        if (!context.is_business_hours && action !== 'handoff_human') {
            return {
                verdict: 'REQUIRE_APPROVAL',
                reason_code: 'POLICY.VIOLATION',
                reason_human: 'Ação fora do horário comercial (7h-22h BRT)',
                risk_score: 40,
                authority: { type: 'POLICY', id: 'WB-01' },
                required_checks: ['POLICY_ACTIVE']
            };
        }
        
        // WB-02: Commercial promise detection
        if (content?.message && this.containsCommercialPromise(content.message)) {
            return {
                verdict: 'REQUIRE_APPROVAL',
                reason_code: 'RISK.EXCEEDED',
                reason_human: 'Mensagem contém promessa comercial - requer validação humana',
                risk_score: 80,
                authority: { type: 'POLICY', id: 'WB-02' },
                required_checks: ['POLICY_ACTIVE']
            };
        }
        
        // WB-03: Low confidence block
        if (typeof context.confidence_score === 'number' && context.confidence_score < 0.7) {
            return {
                verdict: 'DENY',
                reason_code: 'RISK.EXCEEDED',
                reason_human: `Confiança insuficiente: ${(context.confidence_score * 100).toFixed(0)}% (mínimo 70%)`,
                risk_score: 90,
                authority: { type: 'POLICY', id: 'WB-03' },
                required_checks: ['POLICY_ACTIVE']
            };
        }
        
        // WB-04 & WB-05: Discount handling
        if (content?.discount_percent) {
            const discountResult = this.evaluateDiscount(content.discount_percent, context.customer_tier);
            if (discountResult) return discountResult;
        }
        
        // WB-06: Spam protection
        if (typeof context.daily_interactions === 'number' && context.daily_interactions > 50) {
            return {
                verdict: 'DENY',
                reason_code: 'OPS.RATE_LIMIT',
                reason_human: `Limite diário excedido: ${context.daily_interactions}/50 interações`,
                risk_score: 85,
                authority: { type: 'POLICY', id: 'WB-06' },
                required_checks: ['POLICY_ACTIVE']
            };
        }
        
        // Default: use LLM proposal
        return {
            verdict: 'ALLOW',
            reason_code: 'OPS.MAINTENANCE',
            reason_human: proposal.explanation?.summary || 'Aprovado pela política',
            risk_score: 10,
            authority: { type: 'POLICY', id: 'DEFAULT' },
            required_checks: ['POLICY_ACTIVE', 'TENANT_ACTIVE']
        };
    }
    
    private containsCommercialPromise(message: string): boolean {
        return COMMERCIAL_PATTERNS.some(pattern => pattern.test(message));
    }
    
    private evaluateDiscount(percent: number, tier: string): any | null {
        // Regular customers: max 20%
        if (tier === 'regular' && percent > 20) {
            return {
                verdict: 'REQUIRE_APPROVAL',
                reason_code: 'POLICY.VIOLATION',
                reason_human: `Desconto ${percent}% excede limite para cliente regular (máx 20%)`,
                risk_score: 70,
                authority: { type: 'POLICY', id: 'WB-04' }
            };
        }
        
        // VIP customers: max 40%
        if (tier === 'vip') {
            if (percent <= 40) {
                return {
                    verdict: 'ALLOW',
                    reason_code: 'OPS.MAINTENANCE',
                    reason_human: `Desconto ${percent}% aprovado para cliente VIP`,
                    risk_score: 20,
                    authority: { type: 'POLICY', id: 'WB-05' },
                    constraints: [`max_discount:${40}`]
                };
            } else {
                return {
                    verdict: 'REQUIRE_APPROVAL',
                    reason_code: 'POLICY.VIOLATION',
                    reason_human: `Desconto ${percent}% excede limite VIP (máx 40%)`,
                    risk_score: 70,
                    authority: { type: 'POLICY', id: 'WB-04' }
                };
            }
        }
        
        // Enterprise: max 50%
        if (tier === 'enterprise') {
            if (percent <= 50) {
                return {
                    verdict: 'ALLOW',
                    reason_code: 'OPS.MAINTENANCE',
                    reason_human: `Desconto ${percent}% aprovado para cliente Enterprise`,
                    risk_score: 10,
                    authority: { type: 'POLICY', id: 'WB-05' },
                    constraints: [`max_discount:${50}`]
                };
            } else {
                return {
                    verdict: 'REQUIRE_APPROVAL',
                    reason_code: 'POLICY.VIOLATION',
                    reason_human: `Desconto ${percent}% excede limite Enterprise (máx 50%)`,
                    risk_score: 75,
                    authority: { type: 'POLICY', id: 'WB-04' }
                };
            }
        }
        
        return null; // No discount policy triggered
    }
}

// Export singleton
export const whatsappBotPolicy = new WhatsAppBotPolicy();
