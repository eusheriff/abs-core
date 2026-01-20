# Policy Pack v0 — Bot Operacional

## Escopo

Bots de atendimento/vendas (WhatsApp - NetCar/Manú)

---

## P-01 — Ação Fora de Horário

| Campo | Valor |
|-------|-------|
| **ID** | P-01 |
| **Trigger** | `horário ∉ janela_permitida` |
| **Decisão** | `handoff` |
| **Racional** | Evita risco reputacional |

```text
IF horário ∉ janela_permitida
THEN handoff
```

---

## P-02 — Promessa Implícita de Valor

| Campo | Valor |
|-------|-------|
| **ID** | P-02 |
| **Trigger** | Mensagem contém promessa comercial, reserva, condição especial |
| **Decisão** | `handoff` |
| **Racional** | Risco financeiro indireto |

```text
IF mensagem contém promessa_comercial OR reserva OR condição_especial
THEN handoff
```

**Exemplos de gatilho:**

- "posso verificar desconto"
- "vou reservar"
- "consigo uma entrada menor"

---

## P-03 — Baixa Confiança

| Campo | Valor |
|-------|-------|
| **ID** | P-03 |
| **Trigger** | `confidence < 0.70` OR `confidence undefined` |
| **Decisão** | `deny` |
| **Racional** | Falha segura > resposta errada |

```text
IF confidence < 0.70 OR confidence IS NULL
THEN deny
```

---

## P-04 — Escalada Automática de Lead

| Campo | Valor |
|-------|-------|
| **ID** | P-04 |
| **Trigger** | `intent = escalar_humano` |
| **Decisão** | `allow` SE sinais mínimos presentes, `deny` caso contrário |
| **Racional** | Evita spam operacional |

```text
IF intent = escalar_humano AND sinais_minimos_presentes
THEN allow
ELSE deny
```

**Sinais mínimos:**

- Mencionou produto/serviço específico
- Fez pergunta sobre preço/condição
- Demonstrou intenção explícita

---

## P-05 — Repetição de Ação

| Campo | Valor |
|-------|-------|
| **ID** | P-05 |
| **Trigger** | Mesma ação executada < X minutos |
| **Decisão** | `deny` |
| **Racional** | Evita loops e assédio involuntário |

```text
IF mesma_acao_executada_recentemente (< 5 min)
THEN deny
```

---

## Hierarquia de Decisão

```text
P-01 (Horário)
    ↓
P-05 (Repetição)
    ↓
P-02 (Promessa)
    ↓
P-03 (Confiança)
    ↓
P-04 (Escalada)
    ↓
ALLOW (default)
```

## Referências

- [ADR-003](./ADR-003-first-domain.md)
- [Decision Contract v0](./decision_contract_v0.md)
