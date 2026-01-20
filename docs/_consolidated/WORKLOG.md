# WORKLOG.md — OConnector ABS Core

> Registro de mudanças, comandos e validações.

## 2026-01-19 — v0.9: Performance & Scalability (Implemented)
- **Status**: Implementado.
- **Features**: Async Support, EventProcessor, CLI Polling, Metrics.

## 2026-01-19 — v1.0: Enterprise Trust & Security (Released)

### Contexto
- Auditoria apontou riscos de segurança e falta de "trust" no log de eventos.
- Repositório continha arquivos sensíveis/locais (`.db`, `.wrangler`).

- 2026-01-20: Implemented Scanner vs Runtime strategy (ADR-002)
  - Refactored `EventProcessor` to support `ABS_MODE`.
  - Added `scanner` mode (passive monitoring) and `runtime` mode (active enforcement).
  - Created `src/policies/starter-pack.ts` as example.
  - Verification: `test/scanner.test.ts` passed.
  - Updated `STATE.md` to v2.3.
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


- 2026-01-20: Implemented Human-in-the-Loop (ESCALATE) (Roadmap Vector 1)
  - **Schema**: Added `pending_reviews` table.
  - **Logic**: Updated `processor.ts` to support `ESCALATE` decision and creating review records.
  - **API**: Added `/admin/reviews` endpoints (List, Approve, Reject).
  - **Integration**: Registered `reviewsRouter` in `factory.ts`.
  - **Status**: Ready for manual testing/integration.
- 2026-01-20: Implemented Dynamic Policy Engine (Roadmap Vector 2)
  - **Core**: Added `json-logic-js` dependency.
  - **Schema**: Created `PolicyRuleSchema` (Zod).
  - **Adapter**: Implemented `DynamicPolicy` class.
  - **Registry**: Added `loadRules` to `PolicyRegistry`.
  - **Verification**: Added unit tests covering dynamic rule evaluation.
  - **Status**: Ready for defining rules via JSON/ENV.

- 2026-01-20: Implemented Forensic Observability (Roadmap Vector 3)
  - **Core**: Added `TraceContext` and structured `Logger`.
  - **API**: Updated `events.ts` to handle and propagate `x-trace-id`.
  - **Worker**: Updated async processor to maintain context.
  - **Test**: Added E2E verification in `test/observability.test.ts`.
  - **Status**: Full tracing (Request -> Queue -> Worker -> DB).

- 2026-01-20: Implemented Deterministic Replay (VCR) (Roadmap Vector 4)
  - **Core**: Implemented `VCRProvider` wrapper.
  - **Refactor**: Decoupled `LLMProvider` interfaces to `src/core/interfaces.ts`.
  - **Test**: Created `test/vcr.test.ts` verifying Record, Replay, and Failure modes.
  - **Status**: Functional (controlled by `ABS_VCR_MODE` env var).

- 2026-01-20: Implemented Idempotency & Partial Failures (Vector 5)
  - **Schema**: Created `004_idempotency.sql` adding UNIQUE constraint on `decision_logs.event_id`.
  - **Logic**: Updated `EventProcessor` to catch unique constraint violations and return `processed_duplicate`.
  - **Tests**: Added `test/idempotency.test.ts` verifying Hard Check (0ms) and Race Condition Recovery.
  - **Docs**: Created `ADR-003` justifying DB constraints over Durable Objects.
  - **Refinement**: Standardized duplicate status to `processed_duplicate` across all paths.
  - **Status**: Completed and Tested.

- 2026-01-20: Implemented Forensic Observability II (Vector 6)
  - **Logic**: Instrumented `EventProcessor` with high-resolution timers.
  - **Schema**: Added `latency_breakdown` (JSON) to `decision_logs.metadata`.
  - **Features**: Breakdown includes `validation_ms`, `idempotency_ms`, `sanitization_ms`, `llm_ms`, `policy_ms`, `db_ms`, `overhead_ms`.
  - **Assurance**: Verified `trace_id` persistence end-to-end.
  - **Test**: Added `test/observability.test.ts` (Pass).

- 2026-01-20: Release v2.7.0
  - **Vectors**: Completed V1 (Escalate), V2 (Policies), V3/V6 (Forensic), V4 (VCR), V5 (Idempotency).
  - **Version**: Bumped `@abs/core` to `2.7.0`.
  - **Status**: Stable.

- 2026-01-20: Audit Remediation (Pipeline 10/10)
  - **Issue**: External audit report (8.2/10) highlighted opacity and lock-in risks.
  - **Fixes**:
    - **Transparency**: Added Code Map to README linking to core source.
    - **Lock-in**: Documented Docker usage for cloud-agnostic deployment.
    - **Security**: Link `SECURITY.md` risks directly to mitigation code.
    - **Assurance**: Added Coverage Badge and improved E2E tests (Idempotency).
    - **Ecosystem**: Released Policy Library (`examples/policies`) and Issue Templates.
  - **Status**: Remediation Complete. Ready for GitHub Security Alerts.

- 2026-01-20: Dashboard Forensic Visualization (Vector 6)
  - **Feature**: Added "Latency Analysis" column to Admin Dashboard.
  - **Visualization**: Stacked Bar Chart broken down by:
    - 🔵 LLM (Generative)
    - 🟡 Policy (Governance)
    - 🟣 DB (Persistence)
    - ⚪ Overhead (Validation/Sanitization)
  - **Goal**: Demonstrate granular "Traceability" for Enterprise clients.
  - **Status**: Deployed (v2.7.0+).

- 2026-01-20: Architecture Split - Scanner SDK POC (Phase 5)
  - **Goal**: Validate "Sentry-like" passive extension model.
  - **Artifacts**:
    - Created `packages/scanner` (Lightweight TS SDK).
    - Created `examples/scanner_demo.ts`.
  - **Validation**:
    - Build successful (manual `tsc`).
    - Demo executed: Events ingested by v2.7.0 backend.
    - Dashboard: Confirmed logs visible with "Latency Breakdown".
  - **Strategic Impact**: Proven feasibility of splitting "Scanner" (Free) from "Runtime" (Paid).

- 2026-01-20: Ecosystem & IAM Implementation (Phases 7 & 8)
  - **Goal**: Commercialize ABS with a "Seat-based" model and Anti-Bot protection.
  - **Landing Page**:
    - **Tech**: Next.js 14 + Tailwind (Cloudflare Pages).
    - **Features**: Scanner Demo, Pricing Funnel (MIT vs Enterprise).
    - **Domain**: `abscore.app` (DNS migrated to Cloudflare).
  - **IAM System**:
    - **Architecture**: `auth-worker` (Hono) using Cloudflare KV (`ABS_AUTH`).
    - **Security**: Added Cloudflare Turnstile CAPTCHA to Login Page.
    - **Integration**: MCP Server now enforces `ABS_TOKEN` check on startup.
    - **Client**: Web Dashboard built for Token Generation.
  - **Licensing**:
    - **Model**: Open Core (MIT Scanner, Commercial Runtime).
    - **Docs**: Created `LICENSING.md`.
  - **Status**: Ready for Enterprise Beta (`v2.8.0`).
