# Changelog

## [0.5.0] - 2026-01-19 (Public Launch Candidate)

### 🚀 Major Features
- **Governance Engine**: `Policy` gate implementation with `ALLOW`, `DENY`, `MANUAL_REVIEW`.
- **Dashboard MVP**: Next.js Dashboard for decision observability (`packages/dashboard`).
- **CLI**: `abs serve`, `abs simulate`, `abs scan`.

### 🛡️ Security & Reliability
- **Static Analysis Cleanup**: Resolved 108 violations (Security, Types, Logs).
- **Safe Evaluation**: Removed unsafe `eval` usage in examples.
- **Path Validation**: Added traversal protection in CLI file reading.
- **Type Safety**: Refactored `DatabaseAdapter` to use `isSuccess` (breaking change from `success`).
- **Strict Typing**: Removed `any` from core routes and invariants.

### 🐛 Fixes
- Fixed potential SQL/DDL injection warnings (verified as static).
- Fixed inconsistency in `db.run` return types across adapters (Local, D1, Mock).
