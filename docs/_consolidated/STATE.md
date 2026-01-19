# STATE.md — OConnector ABS Core

> Fonte da verdade para continuidade entre sessões e LLMs.

## Projeto

| Campo | Valor |
|-------|-------|
| **Nome** | oconnector-abs-core |
| **Estratégia** | Open Core (Apache-2.0 + componentes comerciais) |
| **Estágio** | v0.5.0 Monorepo + Scan MVP |
| **Maintainer** | OConnector Technology |
| **Autor** | Rodrigo Gomes |
| **Início** | 2026-01-19 |
| **Deploy** | [Live URL](https://abs-core.dev-oconnector.workers.dev) |

## Visão

**ABS Core: A governance-first runtime for autonomous business decisions.**
Priorizamos a confiabilidade da decisão sobre a inteligência do modelo. Autonomia sem governança é risco.

## Estado Atual

- **Fase**: v0.5 (Monorepo Refactor).
- **Modules**: Core (Runtime), Scan (Static Analysis), CLI (Unified).
- **Scanner**: MVP com detecção de execução direta e logs ausentes.

## Roadmap

| Versão | Goal | Status |
|--------|------|--------|
| v0.5 | Master Audit (Integrity & Security) | ✅ Concluído |
| v0.5-oss | **Public Launch (GitHub + LinkedIn)** | ✅ Pronto |
| v0.6 | AuthZ & Multi-Policy | ⏳ Planejado |

## Decisões Fixas

- **License**: Apache 2.0
- **Strategy**: CLI-First (Developer Adoption & CI/CD proof).
- **Policy**: Invariante (Hard Gate).
- **Posicionamento**: Engenharia > Marketing.
