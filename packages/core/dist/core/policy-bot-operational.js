"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotOperationalPolicy = void 0;
/**
 * Policy Pack v0 - Bot Operational Policies
 *
 * P-01: Ação Fora de Horário → handoff
 * P-02: Promessa Implícita de Valor → handoff
 * P-03: Baixa Confiança → deny
 * P-04: Escalada Automática de Lead → allow/deny
 * P-05: Repetição de Ação → deny
 */
class BotOperationalPolicy {
    constructor() {
        // Configurable business hours (default: 8am-8pm)
        this.businessHoursStart = 8;
        this.businessHoursEnd = 20;
        // Configurable cooldown period for repeated actions (5 minutes)
        this.cooldownMs = 5 * 60 * 1000;
        // Track last actions per conversation
        this.lastActions = new Map();
        // Keywords that indicate commercial promises
        this.promiseKeywords = [
            "desconto",
            "reservar",
            "reserva",
            "garantir",
            "garantia",
            "entrada",
            "financiamento",
            "parcela",
            "condição especial",
            "posso verificar",
            "vou verificar",
            "consigo",
        ];
        // Minimum signals required for lead escalation
        this.minSignalsForEscalation = 2;
    }
    evaluate(proposal, context) {
        // Convert to envelope format if needed
        const envelope = this.toEnvelope(proposal, context);
        const decision = this.evaluateEnvelope(envelope);
        // Map to legacy PolicyResult
        if (decision.outcome === "allow")
            return "ALLOW";
        if (decision.outcome === "handoff")
            return "MANUAL_REVIEW";
        return "DENY";
    }
    /**
     * Main evaluation method using Decision Envelope v0
     */
    evaluateEnvelope(envelope) {
        // P-01: Ação Fora de Horário
        const p01 = this.checkBusinessHours(envelope);
        if (p01)
            return p01;
        // P-05: Repetição de Ação (check early to prevent spam)
        const p05 = this.checkRepetition(envelope);
        if (p05)
            return p05;
        // P-02: Promessa Implícita de Valor
        const p02 = this.checkCommercialPromise(envelope);
        if (p02)
            return p02;
        // P-03: Baixa Confiança
        const p03 = this.checkConfidence(envelope);
        if (p03)
            return p03;
        // P-04: Escalada Automática de Lead
        const p04 = this.checkLeadEscalation(envelope);
        if (p04)
            return p04;
        // Default: ALLOW
        this.recordAction(envelope);
        return {
            outcome: "allow",
            policy_id: "DEFAULT",
            reason: "Nenhuma política violada",
        };
    }
    /**
     * P-01: Ação Fora de Horário → handoff
     */
    checkBusinessHours(envelope) {
        const now = new Date();
        const hour = now.getHours();
        if (hour < this.businessHoursStart || hour >= this.businessHoursEnd) {
            console.log(`🛡️ P-01: HANDOFF (Fora de horário: ${hour}h)`);
            return {
                outcome: "handoff",
                policy_id: "P-01",
                reason: `Ação fora do horário comercial (${hour}h, permitido ${this.businessHoursStart}-${this.businessHoursEnd}h)`,
            };
        }
        return null;
    }
    /**
     * P-02: Promessa Implícita de Valor → handoff
     */
    checkCommercialPromise(envelope) {
        const messageContent = envelope.context.message_content?.toLowerCase() || "";
        const actionParams = JSON.stringify(envelope.proposal.parameters).toLowerCase();
        const combined = messageContent + " " + actionParams;
        for (const keyword of this.promiseKeywords) {
            if (combined.includes(keyword)) {
                console.log(`🛡️ P-02: HANDOFF (Promessa comercial detectada: "${keyword}")`);
                return {
                    outcome: "handoff",
                    policy_id: "P-02",
                    reason: `Promessa comercial detectada: "${keyword}"`,
                };
            }
        }
        return null;
    }
    /**
     * P-03: Baixa Confiança → deny
     */
    checkConfidence(envelope) {
        const confidence = envelope.context.confidence;
        // Undefined confidence = treat as low
        if (confidence === undefined || confidence < 0.7) {
            console.log(`🛡️ P-03: DENY (Baixa confiança: ${confidence ?? "undefined"})`);
            return {
                outcome: "deny",
                policy_id: "P-03",
                reason: `Confiança insuficiente: ${confidence ?? "não informada"} (mínimo: 0.70)`,
            };
        }
        return null;
    }
    /**
     * P-04: Escalada Automática de Lead → allow/deny
     */
    checkLeadEscalation(envelope) {
        if (envelope.intent === "escalar_humano" ||
            envelope.proposal.action === "handoff_to_human") {
            const signals = envelope.context.signals || [];
            if (signals.length >= this.minSignalsForEscalation) {
                console.log(`🛡️ P-04: ALLOW (Escalada com ${signals.length} sinais)`);
                this.recordAction(envelope);
                return {
                    outcome: "allow",
                    policy_id: "P-04",
                    reason: `Escalada permitida com ${signals.length} sinais: ${signals.join(", ")}`,
                };
            }
            else {
                console.log(`🛡️ P-04: DENY (Escalada sem sinais suficientes: ${signals.length})`);
                return {
                    outcome: "deny",
                    policy_id: "P-04",
                    reason: `Escalada negada: apenas ${signals.length} sinais (mínimo: ${this.minSignalsForEscalation})`,
                };
            }
        }
        return null;
    }
    /**
     * P-05: Repetição de Ação → deny
     */
    checkRepetition(envelope) {
        const key = envelope.context.conversation_id || envelope.actor.name;
        const last = this.lastActions.get(key);
        if (last) {
            const timeSinceLastMs = Date.now() - last.timestamp;
            if (last.action === envelope.proposal.action &&
                timeSinceLastMs < this.cooldownMs) {
                const remainingSeconds = Math.ceil((this.cooldownMs - timeSinceLastMs) / 1000);
                console.log(`🛡️ P-05: DENY (Ação repetida: ${envelope.proposal.action})`);
                return {
                    outcome: "deny",
                    policy_id: "P-05",
                    reason: `Ação "${envelope.proposal.action}" repetida muito rapidamente (aguardar ${remainingSeconds}s)`,
                };
            }
        }
        return null;
    }
    /**
     * Record action for repetition tracking
     */
    recordAction(envelope) {
        const key = envelope.context.conversation_id || envelope.actor.name;
        this.lastActions.set(key, {
            action: envelope.proposal.action,
            timestamp: Date.now(),
        });
    }
    /**
     * Convert legacy DecisionProposal to DecisionEnvelope
     */
    toEnvelope(proposal, context) {
        return {
            id: proposal.proposal_id,
            timestamp: new Date().toISOString(),
            environment: "runtime",
            actor: {
                type: "bot",
                name: context?.actor_name || "unknown",
                channel: context?.channel || "api",
            },
            intent: proposal.recommended_action,
            proposal: {
                action: proposal.recommended_action,
                parameters: proposal.action_params,
            },
            context: {
                lead_id: context?.lead_id,
                conversation_id: context?.conversation_id,
                confidence: proposal.confidence,
                signals: context?.signals || [],
                last_action_at: context?.last_action_at,
                message_content: context?.message_content,
            },
            risk_level: proposal.risk_level,
        };
    }
}
exports.BotOperationalPolicy = BotOperationalPolicy;
