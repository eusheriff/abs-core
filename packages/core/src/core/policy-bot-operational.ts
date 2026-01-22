import { DecisionProposal } from "./schemas";
import { PolicyEngine } from "./interfaces";

/**
 * Policy Pack v0 - Bot Operational Policies (Migrated to ADR-008)
 *
 * P-01: Ação Fora de Horário → REQUIRE_APPROVAL
 * P-02: Promessa Implícita de Valor → REQUIRE_APPROVAL
 * P-03: Baixa Confiança → DENY
 * P-04: Escalada Automática de Lead → ALLOW/DENY
 * P-05: Repetição de Ação → DENY
 */
export class BotOperationalPolicy implements PolicyEngine {
  name = 'BotOperationalPolicy';
  
  // Configurable business hours (default: 8am-8pm)
  private businessHoursStart = 8;
  private businessHoursEnd = 20;

  // Configurable cooldown period for repeated actions (5 minutes)
  private cooldownMs = 5 * 60 * 1000;

  // Track last actions per conversation
  private lastActions: Map<string, { action: string; timestamp: number }> =
    new Map();

  // Keywords that indicate commercial promises
  private promiseKeywords = [
    "desconto", "reservar", "reserva", "garantir", "garantia", 
    "entrada", "financiamento", "parcela", "condição especial", 
    "posso verificar", "vou verificar", "consigo"
  ];

  // Minimum signals required for lead escalation
  private minSignalsForEscalation = 2;

  evaluate(proposal: DecisionProposal, context: any): any {
      // P-01: Ação Fora de Horário
      const p01 = this.checkBusinessHours();
      if (p01) return p01;

      // P-05: Repetição de Ação (check early to prevent spam)
      const p05 = this.checkRepetition(proposal, context);
      if (p05) return p05;

      // P-02: Promessa Implícita de Valor
      const p02 = this.checkCommercialPromise(context);
      if (p02) return p02;

      // P-03: Baixa Confiança
      const p03 = this.checkConfidence(proposal);
      if (p03) return p03;

      // P-04: Escalada Automática de Lead
      const p04 = this.checkLeadEscalation(proposal, context);
      if (p04) return p04;

      // Default: ALLOW
      this.recordAction(proposal, context);
      return {
          verdict: 'ALLOW',
          reason_code: 'OPS.MAINTENANCE',
          reason_human: 'Nenhuma política operacional violada.',
          risk_score: 0,
          required_checks: ['POLICY_ACTIVE']
      };
  }

  /**
   * P-01: Ação Fora de Horário → REQUIRE_APPROVAL
   */
  private checkBusinessHours(): any | null {
    const now = new Date();
    const hour = now.getHours();

    if (hour < this.businessHoursStart || hour >= this.businessHoursEnd) {
      console.log(`🛡️ P-01: HANDOFF (Fora de horário: ${hour}h)`);
      return {
        verdict: 'REQUIRE_APPROVAL',
        reason_code: 'POLICY.VIOLATION',
        reason_human: `Ação fora do horário comercial (${hour}h, permitido ${this.businessHoursStart}-${this.businessHoursEnd}h)`,
        risk_score: 40,
        required_checks: ['POLICY_ACTIVE']
      };
    }
    return null;
  }

  /**
   * P-02: Promessa Implícita de Valor → REQUIRE_APPROVAL
   */
  private checkCommercialPromise(context: any): any | null {
    const messageContent = context?.message_content?.toLowerCase() || "";
    // Check message content primarily
    for (const keyword of this.promiseKeywords) {
      if (messageContent.includes(keyword)) {
        console.log(`🛡️ P-02: HANDOFF (Promessa comercial detectada: "${keyword}")`);
        return {
          verdict: 'REQUIRE_APPROVAL',
          reason_code: 'RISK.EXCEEDED',
          reason_human: `Promessa comercial detectada: "${keyword}"`,
          risk_score: 75,
          required_checks: ['POLICY_ACTIVE', 'INCIDENT_CLEAR']
        };
      }
    }
    return null;
  }

  /**
   * P-03: Baixa Confiança → DENY
   */
  private checkConfidence(proposal: DecisionProposal): any | null {
    const confidence = proposal.confidence;

    // Undefined confidence = treat as low
    if (confidence === undefined || confidence < 0.7) {
      console.log(`🛡️ P-03: DENY (Baixa confiança: ${confidence ?? "undefined"})`);
      return {
        verdict: 'DENY',
        reason_code: 'RISK.EXCEEDED',
        reason_human: `Confiança insuficiente: ${confidence ?? "não informada"} (mínimo: 0.70)`,
        risk_score: 85,
        required_checks: ['POLICY_ACTIVE']
      };
    }
    return null;
  }

  /**
   * P-04: Escalada Automática de Lead → ALLOW/DENY
   */
  private checkLeadEscalation(proposal: DecisionProposal, context: any): any | null {
    if (proposal.recommended_action === "handoff_to_human" || proposal.recommended_action === "escalar_humano") {
      const signals = context?.signals || [];

      if (signals.length >= this.minSignalsForEscalation) {
        console.log(`🛡️ P-04: ALLOW (Escalada com ${signals.length} sinais)`);
        this.recordAction(proposal, context);
        return {
            verdict: 'ALLOW',
            reason_code: 'OPS.MAINTENANCE',
            reason_human: `Escalada permitida com ${signals.length} sinais: ${signals.join(", ")}`,
            risk_score: 0,
            required_checks: ['POLICY_ACTIVE']
        };
      } else {
        console.log(`🛡️ P-04: DENY (Escalada sem sinais suficientes: ${signals.length})`);
        return {
            verdict: 'DENY',
            reason_code: 'POLICY.VIOLATION',
            reason_human: `Escalada negada: apenas ${signals.length} sinais (mínimo: ${this.minSignalsForEscalation})`,
            risk_score: 60,
            required_checks: ['POLICY_ACTIVE']
        };
      }
    }
    return null;
  }

  /**
   * P-05: Repetição de Ação → DENY
   */
  private checkRepetition(proposal: DecisionProposal, context: any): any | null {
    const key = context?.conversation_id || context?.actor_name || 'unknown';
    const last = this.lastActions.get(key);

    if (last) {
      const timeSinceLastMs = Date.now() - last.timestamp;

      if (
        last.action === proposal.recommended_action &&
        timeSinceLastMs < this.cooldownMs
      ) {
        const remainingSeconds = Math.ceil((this.cooldownMs - timeSinceLastMs) / 1000);
        console.log(`🛡️ P-05: DENY (Ação repetida: ${proposal.recommended_action})`);
        return {
            verdict: 'DENY',
            reason_code: 'OPS.RATE_LIMIT',
            reason_human: `Ação "${proposal.recommended_action}" repetida muito rapidamente (aguardar ${remainingSeconds}s)`,
            risk_score: 50,
            required_checks: ['POLICY_ACTIVE']
        };
      }
    }
    return null;
  }

  private recordAction(proposal: DecisionProposal, context: any): void {
    const key = context?.conversation_id || context?.actor_name || 'unknown';
    this.lastActions.set(key, {
      action: proposal.recommended_action,
      timestamp: Date.now(),
    });
  }
}
