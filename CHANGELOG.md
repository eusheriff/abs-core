# Changelog

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
