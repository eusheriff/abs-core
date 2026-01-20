# POC: WhatsApp Bot Governance

> Design concreto para integrar ABS Core com bot WhatsApp.

## 1. Visão Geral

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  WhatsApp       │     │    ABS Core     │     │   Execution     │
│  Worker         │────►│  (Governance)   │────►│   Layer         │
│                 │     │                 │     │                 │
│  - Recebe msg   │     │  - Policy Gate  │     │  - Envia reply  │
│  - Monta ação   │     │  - Decision Log │     │  - Atualiza CRM │
│  - Consulta ABS │     │  - Trilha D1    │     │  - Cria ticket  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Princípio**: O bot **nunca executa diretamente**. Sempre consulta o ABS antes de qualquer ação com impacto.

---

## 2. Schema de Eventos

### 2.1 Bot Action Request

```typescript
interface BotActionEvent {
  // Identifiers
  event_id: string;           // UUID único
  tenant_id: string;          // "whatsapp-bot" ou tenant específico
  correlation_id: string;     // ID da conversa para rastreio
  
  // Event metadata
  event_type: string;         // "bot.reply" | "bot.handoff" | "bot.broadcast"
  source: string;             // "whatsapp-worker"
  occurred_at: string;        // ISO 8601
  
  // Payload específico do bot
  payload: {
    // Ação proposta
    action: "send_message" | "create_ticket" | "apply_discount" | "handoff_human";
    
    // Contexto da conversa
    conversation: {
      customer_phone: string;   // Anonimizado ou hash
      channel: "whatsapp" | "instagram" | "telegram";
      started_at: string;
      message_count: number;
      last_intent: string;      // Ex: "refund_request", "pricing_question"
    };
    
    // Conteúdo da ação
    content: {
      message?: string;         // Mensagem a ser enviada
      discount_percent?: number;
      ticket_priority?: "low" | "medium" | "high";
    };
    
    // Contexto para policies
    context: {
      timestamp: string;
      confidence_score: number; // 0.0 - 1.0
      is_business_hours: boolean;
      customer_tier: "regular" | "vip" | "enterprise";
      daily_interactions: number;
      has_pending_order: boolean;
    };
  };
}
```

### 2.2 Decision Response

```typescript
interface GovernanceDecision {
  decision_id: string;
  event_id: string;
  
  // Resultado
  decision: "allow" | "deny" | "escalate" | "handoff";
  
  // Contexto
  reason: string;
  policy_id: string;
  risk_level: "low" | "medium" | "high" | "critical";
  
  // Timing
  processing_time_ms: number;
  decided_at: string;
  
  // Modificações permitidas (se allow)
  allowed_modifications?: {
    max_discount?: number;
    restricted_topics?: string[];
  };
}
```

---

## 3. Policies Implementadas

### Policy Pack: WhatsApp Bot v0

| ID | Regra | Trigger | Decisão |
|----|-------|---------|---------|
| **WB-01** | Fora do horário | `!context.is_business_hours` | HANDOFF |
| **WB-02** | Promessa comercial | `content.message` contém preço/desconto | HANDOFF |
| **WB-03** | Confiança baixa | `context.confidence_score < 0.7` | DENY |
| **WB-04** | Desconto alto | `content.discount_percent > 20` | ESCALATE |
| **WB-05** | Cliente VIP | `context.customer_tier === 'vip'` | `max_discount = 40` |
| **WB-06** | Spam protection | `context.daily_interactions > 50` | DENY |

### Código TypeScript

```typescript
// packages/core/src/core/policy-whatsapp-bot.ts

import { Policy, PolicyResult, DecisionProposal } from './interfaces';

export class WhatsAppBotPolicy implements Policy {
  evaluate(event: BotActionEvent, proposal: DecisionProposal): PolicyResult {
    const { payload } = event;
    const { context, content } = payload;
    
    // WB-01: Fora do horário comercial
    if (!context.is_business_hours && payload.action !== 'handoff_human') {
      return {
        decision: 'handoff',
        reason: 'Ação fora do horário comercial (7h-22h BRT)',
        policy_id: 'WB-01',
        risk_level: 'medium'
      };
    }
    
    // WB-03: Confiança baixa
    if (context.confidence_score < 0.7) {
      return {
        decision: 'deny',
        reason: `Confiança insuficiente: ${(context.confidence_score * 100).toFixed(0)}%`,
        policy_id: 'WB-03',
        risk_level: 'high'
      };
    }
    
    // WB-04: Desconto alto
    if (content.discount_percent && content.discount_percent > 20) {
      if (context.customer_tier === 'vip' && content.discount_percent <= 40) {
        // WB-05: VIP pode ter até 40%
        return {
          decision: 'allow',
          reason: 'Desconto aprovado para cliente VIP',
          policy_id: 'WB-05',
          risk_level: 'medium',
          allowed_modifications: { max_discount: 40 }
        };
      }
      return {
        decision: 'escalate',
        reason: `Desconto ${content.discount_percent}% requer aprovação`,
        policy_id: 'WB-04',
        risk_level: 'high'
      };
    }
    
    // WB-06: Spam protection
    if (context.daily_interactions > 50) {
      return {
        decision: 'deny',
        reason: 'Limite diário de interações excedido',
        policy_id: 'WB-06',
        risk_level: 'high'
      };
    }
    
    // Default: usar proposta do LLM
    return {
      decision: proposal.recommended_action as any,
      reason: proposal.explanation,
      policy_id: 'DEFAULT',
      risk_level: proposal.risk_level
    };
  }
}
```

---

## 4. Wiring: WhatsApp Worker → ABS

### 4.1 Função de Consulta

```typescript
// whatsapp-worker/src/governance.ts

const ABS_API_URL = process.env.ABS_API_URL || 'http://localhost:8787';
const ABS_API_KEY = process.env.ABS_API_KEY;

interface GovernanceResult {
  allowed: boolean;
  decision: GovernanceDecision;
}

export async function checkGovernance(
  action: string,
  conversation: ConversationContext,
  content: MessageContent,
  context: BusinessContext
): Promise<GovernanceResult> {
  
  const event: BotActionEvent = {
    event_id: crypto.randomUUID(),
    tenant_id: 'whatsapp-bot',
    correlation_id: conversation.id,
    event_type: `bot.${action}`,
    source: 'whatsapp-worker',
    occurred_at: new Date().toISOString(),
    payload: {
      action,
      conversation,
      content,
      context
    }
  };

  const response = await fetch(`${ABS_API_URL}/v1/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ABS_API_KEY}`
    },
    body: JSON.stringify(event)
  });

  if (!response.ok) {
    // Fail closed: se ABS falha, não executa
    console.error('ABS governance check failed:', await response.text());
    return {
      allowed: false,
      decision: {
        decision: 'deny',
        reason: 'Governance service unavailable - fail closed',
        policy_id: 'SYSTEM',
        risk_level: 'critical'
      }
    };
  }

  const result = await response.json();
  
  return {
    allowed: result.decision === 'allow',
    decision: result
  };
}
```

### 4.2 Uso no Handler

```typescript
// whatsapp-worker/src/handler.ts

export async function handleMessage(message: IncomingMessage) {
  // 1. LLM propõe resposta
  const llmResponse = await generateResponse(message);
  
  // 2. Consulta governança ANTES de executar
  const governance = await checkGovernance(
    'send_message',
    { 
      customer_phone: hashPhone(message.from),
      channel: 'whatsapp',
      started_at: conversation.startedAt,
      message_count: conversation.messageCount,
      last_intent: llmResponse.intent
    },
    { message: llmResponse.text },
    {
      timestamp: new Date().toISOString(),
      confidence_score: llmResponse.confidence,
      is_business_hours: isBusinessHours(),
      customer_tier: await getCustomerTier(message.from),
      daily_interactions: await getDailyCount(message.from),
      has_pending_order: await hasPendingOrder(message.from)
    }
  );

  // 3. Age baseado na decisão
  switch (governance.decision.decision) {
    case 'allow':
      await sendWhatsAppMessage(message.from, llmResponse.text);
      break;
      
    case 'deny':
      console.log(`Action denied: ${governance.decision.reason}`);
      // Não faz nada ou envia resposta genérica
      break;
      
    case 'handoff':
      await transferToHuman(message.from, governance.decision.reason);
      break;
      
    case 'escalate':
      await createApprovalTicket(message, governance.decision);
      break;
  }
  
  // 4. Log local correlacionado
  console.log(`Decision: ${governance.decision.decision_id} -> ${governance.decision.decision}`);
}
```

---

## 5. Métricas e Observabilidade

### Dashboard de Governança

```
GET /metrics?format=json

{
  "decisions": {
    "allow": 1847,
    "deny": 42,
    "handoff": 156,
    "escalate": 23
  },
  "latency": {
    "p50": 12,
    "p95": 45,
    "p99": 89
  },
  "policies": {
    "WB-01": 89,   // fora de horário
    "WB-03": 42,   // baixa confiança
    "WB-04": 23,   // desconto alto
    "DEFAULT": 1914
  }
}
```

### Alertas Sugeridos

| Métrica | Threshold | Ação |
|---------|-----------|------|
| `deny_rate > 10%` | 5 min | Investigar LLM ou dados |
| `latency_p95 > 200ms` | 1 min | Verificar D1/LLM |
| `WB-03 > 50/hora` | 1 hora | Retreinar intent model |

---

## 6. Próximos Passos

1. **Deploy do ABS Core** com policy `WhatsAppBotPolicy`
2. **Integrar no whatsapp-worker** usando `checkGovernance()`
3. **Configurar métricas** em dashboard (Grafana/CloudWatch)
4. **Rodar por 1 semana** e coletar:
   - Taxa de allow/deny/handoff
   - Falsos positivos (ações negadas indevidamente)
   - Latência adicionada
5. **Iterar policies** baseado em dados reais
