# Decision Contract v0 — Bot Operacional

## Objetivo

Padronizar qualquer decisão do bot que gere efeito externo perceptível.

## Schema

```typescript
interface DecisionEnvelope_v0 {
  // Identificação
  id: string;                      // UUID
  timestamp: string;               // ISO8601

  // Ambiente
  environment: "runtime";

  // Ator
  actor: {
    type: "bot";
    name: "NetCarBot" | "Manu";
    channel: "whatsapp" | "telegram" | "api";
  };

  // Intenção
  intent: string;                  // Ex: "qualificar_lead", "oferecer_followup"

  // Proposta
  proposal: {
    action: string;                // Ex: "escalar_humano", "enviar_mensagem"
    parameters: Record<string, any>;
  };

  // Contexto
  context: {
    lead_id?: string;
    conversation_id?: string;
    confidence?: number;           // 0..1 (se houver)
    signals?: string[];            // evidências observáveis
  };

  // Risco
  risk_level: "low" | "medium" | "high";

  // Verificação
  verification: {
    type: "policy" | "human";
    required: boolean;
  };

  // Decisão Final
  decision: {
    outcome: "allow" | "deny" | "handoff";
    policy_id?: string;
    reason: string;
  };
}
```

## Notas de Design

1. **Não há "verdade" aqui** — há decisão rastreável
2. **`confidence` não decide nada sozinho** — apenas informa
3. **`handoff` é estado de sucesso**, não erro
4. **Se `confidence` undefined** → tratar como baixa (fallback seguro)

## Exemplo de Uso

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-01-19T21:45:00Z",
  "environment": "runtime",
  "actor": {
    "type": "bot",
    "name": "NetCarBot",
    "channel": "whatsapp"
  },
  "intent": "escalar_lead",
  "proposal": {
    "action": "handoff_to_human",
    "parameters": {
      "lead_id": "lead_123",
      "reason": "interesse em financiamento"
    }
  },
  "context": {
    "lead_id": "lead_123",
    "conversation_id": "conv_456",
    "confidence": 0.85,
    "signals": ["mencionou financiamento", "perguntou sobre entrada"]
  },
  "risk_level": "medium",
  "verification": {
    "type": "policy",
    "required": true
  },
  "decision": {
    "outcome": "allow",
    "policy_id": "P-04",
    "reason": "sinais mínimos presentes para escalada"
  }
}
```

## Referências

- [ADR-003](./ADR-003-first-domain.md)
- [Policy Pack v0](./policy_pack_v0.md)
