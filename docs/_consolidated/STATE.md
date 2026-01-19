# STATE.md — OConnector ABS Core

> Fonte da verdade para continuidade entre sessões e LLMs.

## Projeto

| Campo | Valor |
|-------|-------|
| **Nome** | oconnector-abs-core |
| **Estratégia** | Open Core (Apache-2.0 + componentes comerciais) |
| **Estágio** | v0.3 Stable (API + Integration) |
| **Maintainer** | OConnector Technology |
| **Autor** | Rodrigo Gomes |
| **Início** | 2026-01-19 |

## Visão

**ABS Core: A governance-first runtime for autonomous business decisions.**
Priorizamos a confiabilidade da decisão sobre a inteligência do modelo. Autonomia sem governança é risco.

## Estado Atual

- **Fase**: v0.3 Concluída (Integração).
- **Status**: API REST Hono implementada. Banco de Dados SQLite integrado. LLM Adapter (OpenAI) pronto.
- **Bloqueios**: Nenhum. Depende de `npm install` no lado do usuário.

## Roadmap

| Versão | Goal | Status |
|--------|------|--------|
| v0.1 | Publicar especificações e contratos base | ✅ Concluído |
| v0.2 | Framework mínimo de orquestração (Runtime) | ✅ Concluído |
| v0.3 | Integração Real (API, LLM, Ingestion) | ✅ Concluído |
| v1.0 | Padrão de mercado para ABS Core | ⏳ Planejado |

## Próximos Passos (Evolução)

1. [ ] Implementar Policy Engine Real (substituir stub por JSON-Logic ou OPA)
2. [ ] Melhorar persistência (migrar para D1 para Cloudflare)
3. [ ] Dashboard de Observabilidade (ler SQLite e mostrar logs)

## Decisões Fixas

- Framework API: Hono
- DB: SQLite (com better-sqlite3)
- LLM: OpenAI SDK
