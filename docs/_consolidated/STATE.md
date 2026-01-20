# Estado Atual do Sistema

## Status
- **Version**: `v2.7.0`
- **State**: 🟢 RELEASED (Enterprise)
- **URL**: `https://abs.oconnector.tech`
- **Score**: 8.2/10 (Audit) -> Targeting 10/10 with Ecosystem additions.

## Roadmap & Next Steps
1. **Security**: User must enable GitHub Security Alerts & Dependabot.
2. **Community**: Issue/PR Templates added.
3. **Examples**: Policy Library seeded.
4. **Adoption**: Promote usage of `abs-core` as standard runtime.

## Arquitetura Atual

- **Core**: Unified Runtime (`packages/core/src/api/factory.ts`)
  - **Modes**: `scanner` (Free/Passive) vs `runtime` (Paid/Active).
  - **2026-01-20**: Implemented **Vector 5 (Idempotency)**.
  - **Schema**: Created `004_idempotency.sql` adding UNIQUE index on `decision_logs(event_id)`.
  - **Logic**: Updated `EventProcessor.process` to catch unique constraint violations and return existing decision (`processed_duplicate`).
  - **Tests**: Added `idempotency.test.ts` verifying Hard Check (0ms) and Race Condition Recovery.
  - **Docs**: Created `ADR-003` justifying DB constraints over Durable Objects.
  - **Fixes**: Corrected invalid event IDs in tests and ensured consistent status codes.
  - **SaaS**: Cloudflare Worker (`worker.ts`)
  - **On-Premise**: Docker Container (`Dockerfile` / `server.ts`)
- **Database**: 
  - **SaaS**: Cloudflare D1
  - **On-Premise**: SQLite (Volume persistente)
- [x] **Vector 5: Partial Failures (Idempotency)**
  - [x] Schema: Unique constraint on `decision_logs.event_id`.
  - [x] Logic: Optimistic concurrency control in `EventProcessor`.
  - [x] Tests: Race condition handling verified via mocks.
  - [x] Decision: ADR-003 (DB Constraints vs Durable Objects).
- [x] **Vector 6: Forensic Observability**
  - [x] Granular Latency Breakdown (`validation`, `llm`, `db`, `overhead`).
  - [x] Persistent Trace ID in `decision_logs` metadata.
  - [x] Verified by `test/observability.test.ts`.
- **Queue**: Cloudflare Queues (SaaS only)
- **Auth**: API Keys (Generic / DB-backed)
- **Auth**: API Keys (D1 com hash SHA-256)
- **LLM**: Gemini 1.5 Flash (6 keys em rodízio)
- **Security**: Prompt Injection Sanitizer + Idempotency Check + Metrics Auth
- **Observability**: `/metrics` (Prometheus) protegido por scope `admin:read`

## Integração Ativa

### Bot Manú (WhatsApp)
- **Policy Pack v0**: 5 políticas de governança
  - P-01: Fora de horário → HANDOFF
  - P-02: Promessa comercial → HANDOFF
  - P-03: Baixa confiança → DENY
  - P-04: Escalada sem sinais → DENY
  - P-05: Repetição → DENY

## Fluxo v2.0

```
[Client] → [Ingestion] → 202 Accepted → [Queue] → [Processor] → [Decision]
              (~5ms)                      async       (Gemini)
```

## Legacy Roadmap
- [x] v1.1: Production Deploy & Ops
- [x] v1.2: Security Hardening
- [x] v1.3: LLM Integration
- [x] v1.4: Prompt Injection Protection
- [x] v2.0: Scale (Queue-based processing)
- [x] v0.6: Bot Operational Governance (Policy Pack v0)
