# STATE.md — OConnector ABS Core

> Fonte da verdade para continuidade entre sessões e LLMs.

## Projeto

| Campo | Valor |
|-------|-------|
| **Nome** | oconnector-abs-core |
| **Estratégia** | Open Core (Apache-2.0 + componentes comerciais) |
| **Estágio** | v0.5.0 Audited (Master Audit Passed) |
| **Maintainer** | OConnector Technology |
| **Autor** | Rodrigo Gomes |
| **Início** | 2026-01-19 |

## Visão

**ABS Core: A governance-first runtime for autonomous business decisions.**
Priorizamos a confiabilidade da decisão sobre a inteligência do modelo. Autonomia sem governança é risco.

## Estado Atual

- **Fase**: v0.5.0 Master Audit Passed (Secure).
- **Status**: Sistema operacional com Ciclo Completo (Evento -> Decisão -> Execução -> Log).
- **Segurança**: Vulnerabilidades críticas (Prompt Injection, Path Traversal) mitigadas.
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
| v0.5+ | Auditoria Técnica Master | ✅ Concluído |
| v1.0 | Padrão de mercado para ABS Core | ⏳ Planejado |

## Próximos Passos (Evolução)

1. [ ] Cloudflare D1 (Trocar SQLite)
2. [ ] AuthZ no Dashboard
3. [ ] Rate Limiting

## Decisões Fixas

- Framework API: Hono
- UI: Hono HTML (Server-Side)
- DB: SQLite
- Providers: OpenAI, Gemini (Multi-key)
- Security: OWASP LLM Hardened
