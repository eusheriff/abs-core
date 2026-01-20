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
    
    evaluate(event: { payload?: BotActionPayload }, proposal: DecisionProposal): PolicyResult {
        const payload = event?.payload;
        
        // Safe guard: if payload doesn't match expected structure, fall back to LLM proposal
        if (!payload || !payload.context) {
            console.log('[WhatsAppBotPolicy] Payload não segue schema esperado, usando proposta do LLM');
            return {
                decision: (proposal.recommended_action || 'escalate') as PolicyResult['decision'],
                reason: proposal.explanation?.summary || 'Payload não segue schema WhatsApp',
                policy_id: 'WB-FALLBACK',
                risk_level: (proposal.risk_level || 'medium') as PolicyResult['risk_level']
            };
        }
        
        const { context, content, action } = payload;
        
        // WB-01: Business hours check
        if (!context.is_business_hours && action !== 'handoff_human') {
            return {
                decision: 'handoff',
                reason: 'Ação fora do horário comercial (7h-22h BRT)',
                policy_id: 'WB-01',
                risk_level: 'medium'
            };
        }
        
        // WB-02: Commercial promise detection
        if (content?.message && this.containsCommercialPromise(content.message)) {
            return {
                decision: 'handoff',
                reason: 'Mensagem contém promessa comercial - requer validação humana',
                policy_id: 'WB-02',
                risk_level: 'high'
            };
        }
        
        // WB-03: Low confidence block
        if (typeof context.confidence_score === 'number' && context.confidence_score < 0.7) {
            return {
                decision: 'deny',
                reason: `Confiança insuficiente: ${(context.confidence_score * 100).toFixed(0)}% (mínimo 70%)`,
                policy_id: 'WB-03',
                risk_level: 'high'
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
                decision: 'deny',
                reason: `Limite diário excedido: ${context.daily_interactions}/50 interações`,
                policy_id: 'WB-06',
                risk_level: 'high'
            };
        }
        
        // Default: use LLM proposal
        return {
            decision: (proposal.recommended_action || 'allow') as PolicyResult['decision'],
            reason: proposal.explanation?.summary || 'Aprovado pela política',
            policy_id: 'DEFAULT',
            risk_level: (proposal.risk_level || 'low') as PolicyResult['risk_level']
        };
    }
    
    private containsCommercialPromise(message: string): boolean {
        return COMMERCIAL_PATTERNS.some(pattern => pattern.test(message));
    }
    
    private evaluateDiscount(percent: number, tier: string): PolicyResult | null {
        // Regular customers: max 20%
        if (tier === 'regular' && percent > 20) {
            return {
                decision: 'escalate',
                reason: `Desconto ${percent}% excede limite para cliente regular (máx 20%)`,
                policy_id: 'WB-04',
                risk_level: 'high'
            };
        }
        
        // VIP customers: max 40%
        if (tier === 'vip') {
            if (percent <= 40) {
                return {
                    decision: 'allow',
                    reason: `Desconto ${percent}% aprovado para cliente VIP`,
                    policy_id: 'WB-05',
                    risk_level: 'medium',
                    allowed_modifications: { max_discount: 40 }
                };
            } else {
                return {
                    decision: 'escalate',
                    reason: `Desconto ${percent}% excede limite VIP (máx 40%)`,
                    policy_id: 'WB-04',
                    risk_level: 'high'
                };
            }
        }
        
        // Enterprise: max 50%
        if (tier === 'enterprise') {
            if (percent <= 50) {
                return {
                    decision: 'allow',
                    reason: `Desconto ${percent}% aprovado para cliente Enterprise`,
                    policy_id: 'WB-05',
                    risk_level: 'low',
                    allowed_modifications: { max_discount: 50 }
                };
            } else {
                return {
                    decision: 'escalate',
                    reason: `Desconto ${percent}% excede limite Enterprise (máx 50%)`,
                    policy_id: 'WB-04',
                    risk_level: 'high'
                };
            }
        }
        
        return null; // No discount policy triggered
    }
}

// Export singleton
export const whatsappBotPolicy = new WhatsAppBotPolicy();
