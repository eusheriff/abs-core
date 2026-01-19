# STATE.md — OConnector ABS Core

> Fonte da verdade para continuidade entre sessões e LLMs.

## Projeto

| Campo | Valor |
|-------|-------|
| **Nome** | oconnector-abs-core |
| **Estratégia** | Open Core (Apache-2.0 + componentes comerciais) |
| **Estágio** | v0.2 (Runtime Prototype) |
| **Maintainer** | OConnector Technology |
| **Autor** | Rodrigo Gomes |
| **Início** | 2026-01-19 |

## Visão

Definir o padrão técnico aberto para construção de Autonomous Business Systems (ABS), separando decisão de execução, com governança, auditabilidade e controle de risco.

## Princípios Imutáveis

1. IA nunca executa ações diretamente
2. Canal (OBot) nunca decide; ABS Core decide
3. Decisão sempre separada de execução
4. Tudo é auditável
5. Governança é requisito, não opcional
6. Autonomia é graduada por risco e degradável automaticamente

## Estado Atual

- **Fase**: v0.2 Entregue (Runtime basics)
- **Status**: Código TypeScript implementado (Zod, XState, CLI). Pendente validação local (npm install).
- **Bloqueios**: Ambiente sem `npm` no path automático. Usar devcontainer ou terminal do usuário.

## Roadmap

| Versão | Goal | Status |
|--------|------|--------|
| v0.1 | Publicar especificações e contratos base | ✅ Concluído |
| v0.2 | Framework mínimo de orquestração | ✅ Code Complete |
| v1.0 | Padrão de mercado para ABS Core | ⏳ Planejado |

## Próximos Passos (v0.3 - Integração)

1. [ ] Conectar CLI a uma API (Express/Hono no Workers)
2. [ ] Substituir mock de eventos por Ingestion real
3. [ ] Integrar Decision Service (OpenAI API call real)

## Decisões Fixas

- Licença: Apache-2.0 para core aberto
- Modelo de governança: BDFL
- Stack de specs: YAML + JSON Schema
- Stack de código: TypeScript + Zod + XState
