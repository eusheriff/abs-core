# WORKLOG.md — OConnector ABS Core

> Registro de mudanças, comandos e validações.

## 2026-01-19 — v0.9: Performance & Scalability (Implemented)
- **Status**: Implementado.
- **Features**: Async Support, EventProcessor, CLI Polling, Metrics.

## 2026-01-19 — v1.0: Enterprise Trust & Security (Released)

### Contexto
- Auditoria apontou riscos de segurança e falta de "trust" no log de eventos.
- Repositório continha arquivos sensíveis/locais (`.db`, `.wrangler`).

### Ações Realizadas
- [x] **Repo Hygiene**:
  - Removido `abs_core.db` e `.wrangler` do git.
  - Atualizado `.gitignore` com padrão Enterprise.
  - Movido `schema.sql` para `packages/core/src/infra/migrations/`.
- [x] **Verifiable Immutability**:
  - Implementado **Hash Chaining** (SHA-256) em `events_store`.
  - Cada evento contém o hash do anterior, garantindo integridade sequencial.
  - Helper `Integrity` criado em `core/integrity.ts`.
- [x] **Security**:
  - Criado `SECURITY.md` com matriz OWASP LLM Top 10.
  - Criado `CHANGELOG.md`.

### Estado Final
- **Versão**: v1.0.0
- **Segurança**: Log auditável e imutável.
- **Operação**: Repo limpo e pronto para CI/CD real.

## 2026-01-19 — v1.1: Production Enterprise Release (2026-01-19)
- **Status**: ✅ DEPLOYED (Production)
- **URL**: `https://abs.oconnector.tech`
- **Infrastructure**: Cloudflare Workers + D1 (Remote)
- **Key Changes**:
  - `Process Polyfill`: Added `globalThis.process` support for Workers.
  - `Schema Fix`: Mapped DB aliases (`id` -> `decision_id`) to fix dashboard crash.
  - `UI Resilience`: Hardened `dashboard.tsx` against corrupt JSON logs.
- **Verification**: 
  - Health Check: 200 OK
  - Dashboard: 200 OK (Rendered)

