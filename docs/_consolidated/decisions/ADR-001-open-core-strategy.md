# ADR-001: Estratégia Open Core para ABS

**Status**: Aceito  
**Data**: 2026-01-19  
**Decisor**: Rodrigo Gomes (OConnector Technology)

## Contexto

O ABS Core é uma fundação para sistemas de negócio autônomos. A decisão sobre modelo de licenciamento afeta:
- Adoção pelo mercado
- Captura de valor comercial
- Confiança e transparência

## Decisão

Adotar modelo **Open Core** com:
- **Core aberto (Apache-2.0)**: Contratos, interfaces, specs, state machine genérica, exemplos educacionais
- **Componentes fechados (Commercial)**: Policy packs avançados, conectores enterprise, dashboards econômicos, runbooks

## Justificativa

1. **Confiança**: Código aberto permite auditoria pública em sistema crítico de decisões
2. **Padrão de mercado**: Posiciona OConnector como definidor do padrão ABS
3. **Monetização**: Valor capturado em operação (policies, connectors, SLA), não em infraestrutura básica
4. **Educação**: Facilita adoção e entendimento do modelo de governança

## Componentes Abertos

- Event Envelope (contratos de eventos)
- State Machine Framework (genérico)
- Process Orchestrator Interface
- DecisionProposal schema
- PolicyDecision schema
- Decision Log schema
- Human-in-the-loop interfaces
- Kill switch interfaces (API apenas)
- Exemplos educacionais

## Componentes Fechados

- Policy packs avançados (financeiro, crédito, LGPD)
- Algoritmos de degradação calibrados
- Métricas econômicas e alertas
- Conectores enterprise (CRM, ERP, Payments)
- Runbooks de incidentes
- SLA/SLO e suporte enterprise

## Consequências

- **Positivas**: Adoção facilitada, confiança pública, thought leadership
- **Negativas**: Concorrentes podem usar core aberto sem pagar
- **Mitigação**: Valor real está na operação (policies + connectors + suporte)
