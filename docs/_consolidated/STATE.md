# STATE.md — OConnector ABS Core

> Fonte da verdade para continuidade entre sessões e LLMs.

## Projeto

| Campo | Valor |
|-------|-------|
| **Nome** | oconnector-abs-core |
| **Estratégia** | Open Core (Apache-2.0 + componentes comerciais) |
| **Estágio** | v0.3.1 Stable (Multi-Provider Support) |
| **Maintainer** | OConnector Technology |
| **Autor** | Rodrigo Gomes |
| **Início** | 2026-01-19 |

## Visão

**ABS Core: A governance-first runtime for autonomous business decisions.**
Priorizamos a confiabilidade da decisão sobre a inteligência do modelo. Autonomia sem governança é risco.

## Estado Atual

- **Fase**: v0.3.1 Concluída.
- **Status**: API suporta OpenAI (`OPENAI_API_KEY`) e Google Gemini (`GEMINI_API_KEY`). Seleção via `LLM_PROVIDER`.
- **Bloqueios**: Nenhum.

## Roadmap

| Versão | Goal | Status |
|--------|------|--------|
| v0.1 | Publicar especificações e contratos base | ✅ Concluído |
| v0.2 | Framework mínimo de orquestração (Runtime) | ✅ Concluído |
| v0.3 | Integração (API, SQLite, OpenAI) | ✅ Concluído |
| v0.3.1 | Suporte a Google Gemini | ✅ Concluído |
| v1.0 | Padrão de mercado para ABS Core | ⏳ Planejado |

## Próximos Passos (Evolução)

1. [ ] Testes E2E com providers reais (Opcional - custo $$$)
2. [ ] Dashboard simples para visualizar `decision_logs`
3. [ ] Implementar sistema de Policy real (OPA)

## Decisões Fixas

- Framework API: Hono
- DB: SQLite
- Providers: OpenAI, Gemini
- Config: dotenv
