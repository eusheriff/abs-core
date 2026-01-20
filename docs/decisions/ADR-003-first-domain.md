# ADR-003 — ABS Core Governa Decisões de Bots Operacionais

## Status

Aceito

## Data

2026-01-19

## Contexto

Bots de atendimento (WhatsApp - NetCar/Manú) executam ações com impacto real:
- Reputacional
- Operacional  
- Financeiro indireto

Erros não são facilmente reversíveis e exigem explicação posterior.

### Exemplos de ações críticas

- Escalar ou não um lead para humano
- Confirmar interesse qualificado (lead "quente" vs "frio")
- Disparar follow-up automático fora de horário
- Prometer condição comercial
- Iniciar ação que cria obrigação operacional

## Decisão

O ABS Core será introduzido **primeiro** para governar decisões de bots operacionais, usando:
- **Decision Envelope v0** (contrato mínimo)
- **Policy Pack v0** (5 regras allow/deny/handoff)

### Por que bots primeiro (e não dev-time/CI)

| Critério | Bot Operacional | Dev-Time (CI/PR) |
|----------|-----------------|------------------|
| Erro reversível? | ❌ Não | ✅ Sim |
| Impacto | Externo | Interno |
| Dor organizacional | Alta | Baixa |
| Urgência política | Alta | Baixa |

Dev-time é excelente como **segundo domínio**, não como primeiro.

## Consequências

### Positivas

- Governança nasce onde dói
- Escopo inicial controlado
- Mesma linguagem de decisão será reutilizada em outros domínios

### Negativas

- Implementação específica para bot (não genérica ainda)
- Requer instrumentação no bot existente

## Não Objetivos (v0)

- Compliance formal (LGPD/CDC)
- Governança universal
- Multi-agent orchestration
- Audit trail persistente

## Próximos Passos

1. Implementar `decision.evaluate(envelope) → decision`
2. Handoff como fluxo de sucesso (não erro)
3. Log estruturado (JSON)
4. Métrica: % de handoff vs erro percebido

## Referências

- [Decision Contract v0](./decision_contract_v0.md)
- [Policy Pack v0](./policy_pack_v0.md)
