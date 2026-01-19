# STATE.md — OConnector ABS Core

> Fonte da verdade para continuidade entre sessões e LLMs.

## Projeto

| Campo | Valor |
|-------|-------|
| **Nome** | oconnector-abs-core |
| **Estratégia** | Open Core (Apache-2.0 + componentes comerciais) |
| **Estágio** | v0.5.0 Audited (Decision Integrity Compliant) |
| **Maintainer** | OConnector Technology |
| **Autor** | Rodrigo Gomes |
| **Início** | 2026-01-19 |

## Visão

**ABS Core: A governance-first runtime for autonomous business decisions.**
Priorizamos a confiabilidade da decisão sobre a inteligência do modelo. Autonomia sem governança é risco.

## Estado Atual

- **Fase**: v0.5.0 Master Audit Compliant.
- **Status**: Sistema Seguro. Policy Gate Ativo.
- **Invariantes**: "Execução requer Policy=ALLOW" garantido por código.
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
| v0.5 | Camada de Execução (Webhooks) | ✅ Concluído |
| v0.5+ | Master Audit (Integrity & Security) | ✅ Concluído |
| v0.6 | Hardening & AuthZ | ⏳ Planejado |

## Próximos Passos (Evolução)

1. [ ] Testes de Regressão Automatizados
2. [ ] AuthZ no Dashboard
3. [ ] Cloudflare D1 Migration

## Decisões Fixas

- Framework API: Hono
- UI: Hono HTML (Server-Side)
- DB: SQLite (com schema migration)
- Providers: OpenAI, Gemini (Multi-key)
- **Governance**: Hard-coded Policy Gate (v0.5)
