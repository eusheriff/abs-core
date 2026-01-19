# STATE.md — OConnector ABS Core

> Fonte da verdade para continuidade entre sessões e LLMs.

## Projeto

| Campo | Valor |
|-------|-------|
| **Nome** | oconnector-abs-core |
| **Estratégia** | Open Core (Scanner Grátis + Enterprise) |
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
- **Current Sprint**: **Static Analysis Cleanup** (Removing violations 108 -> 0).

## Roadmap
- [x] v0.4: Proof of Concept (Done)
- [x] v0.5: Master Audit + Static Analysis (Done)
- [x] v0.5-oss: Public Launch (Released)
- [x] v0.6: AuthZ & Multi-Policy (Implemented)
- [x] v0.7: Event Sourcing & Replay (Implemented)
- [x] v0.8: End-to-End Testing Pipeline (Implemented)
- [x] v0.9: Performance & Scalability (Implemented)
- [ ] v1.0: Production Release (Next)

## Decisões Fixas

- **License**: Apache 2.0
- **Strategy**: CLI-First (Developer Adoption & CI/CD proof).
- **Policy**: Invariante (Hard Gate).
- **Posicionamento**: Engenharia > Marketing.
