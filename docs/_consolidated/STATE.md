# STATE.md — OConnector ABS Core

> Fonte da verdade para continuidade entre sessões e LLMs.

## Projeto

| Campo | Valor |
|-------|-------|
| **Nome** | oconnector-abs-core |
| **Estratégia** | Open Core (Apache-2.0 + componentes comerciais) |
| **Estágio** | v0.4.0 Stable (Observability) |
| **Maintainer** | OConnector Technology |
| **Autor** | Rodrigo Gomes |
| **Início** | 2026-01-19 |

## Visão

**ABS Core: A governance-first runtime for autonomous business decisions.**
Priorizamos a confiabilidade da decisão sobre a inteligência do modelo. Autonomia sem governança é risco.

## Estado Atual

- **Fase**: v0.4.0 Concluída.
- **Status**: Dashboard de Observabilidade ativo em `/dashboard`. Rotação de chaves Gemini ativa.
- **Bloqueios**: Nenhum.

## Roadmap

| Versão | Goal | Status |
|--------|------|--------|
| v0.1 | Publicar especificações e contratos base | ✅ Concluído |
| v0.2 | Framework mínimo de orquestração (Runtime) | ✅ Concluído |
| v0.3 | Integração (API, SQLite, OpenAI) | ✅ Concluído |
| v0.3.1 | Suporte a Google Gemini | ✅ Concluído |
| v0.3.2 | Multi-Key Load Balancing (Gemini) | ✅ Concluído |
| v0.4 | Dashboard de Observabilidade | ✅ Concluído |
| v1.0 | Padrão de mercado para ABS Core | ⏳ Planejado |

## Próximos Passos (Evolução)

1. [ ] Persistência em Nuvem (Cloudflare D1 / PostgreSQL)
2. [ ] Autenticação no Dashboard
3. [ ] Webhook Egress (Execução Real)

## Decisões Fixas

- Framework API: Hono
- UI: Hono HTML (Server-Side)
- DB: SQLite
- Providers: OpenAI, Gemini (Multi-key)
