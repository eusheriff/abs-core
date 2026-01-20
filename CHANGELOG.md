# Changelog

## [v0.6.0] - Bot Operational Governance (Policy Pack v0)
> **Focus**: First domain governance for operational bots.

### 🛡️ Policy Engine v0
- **BotOperationalPolicy**: 5 governance policies for bot actions
  - P-01: Ação Fora de Horário → handoff
  - P-02: Promessa Comercial → handoff
  - P-03: Baixa Confiança → deny
  - P-04: Escalada de Lead → allow/deny based on signals
  - P-05: Repetição de Ação → deny
- **Decision Envelope v0**: Standardized contract for all bot decisions
- **PolicyRegistry**: Auto-registers BotOperationalPolicy for `whatsapp.*` and `bot.*` events

### 📦 SDK & Examples
- **SDK** (`sdk.ts`): Simple integration API with `evaluateAction()`, `createEnvelope()`, `evaluateAndLog()`
- **Examples** (`examples/bot-integration.ts`): 4 integration patterns

### 📝 Documentation
- **ADR-003**: First domain decision (bots before dev-time)
- **Decision Contract v0**: Schema specification
- **Policy Pack v0**: Policy definitions

---

## [v1.0.0] - Enterprise Trust Release
> **Focus**: Security, Immutability, and Repo Hygiene.

### 🛡️ Security & Auditing
- **Verifiable Immutability**: Implemented Hash Chaining (SHA-256) for `events_store`. Each event is cryptographically linked to the previous one.
- **OWASP Compliance**: Added strict `SECURITY.md` matrix covering Prompt Injection, Agency, and Output Handling.
- **Strict Schema**: Hardened database schema in `src/infra/db.ts` with `previous_hash`, `hash`, and `signature` columns.

### 🧹 Hygiene & Operations
- **Clean Repo**: Removed tracked `.db` files and `.wrangler` configuration to prevent secret leakage.
- **Standardized Migrations**: Moved SQL definitions to `src/infra/migrations/`.
- **Improved .gitignore**: strict exclusion of build artifacts and environment secrets.

### ⚡ Core & Performance (from v0.9)
- **Async Ingestion**: `POST /events?async=true` returns `202 Accepted` immediately.
- **Event Processor**: Decoupled processing logic for better testability.
- **Metrics**: Native latency and error tracking.

---

## [v0.5.0] - Audit & Core Refactor
- Initial Monorepo Structure.
- Static Analysis MVP (`@abs/scan`).
- Unified CLI (`abs`).
