# STATE — ABS Core

> **Status**: 🟢 Stable (v2.7.0 + Crypto Audit)
> **Mode**: Enterprise Hardening
> **Focus**: Security, Orchestration, Policy Depth

## Current Context
We have successfully launched ABS Core v2.7.0 and are now in **Phase 12: Enterprise Hardening**.
The recent focus was on **Cryptographic Audit**, ensuring all decision logs are signed with HMAC-SHA256 for tamper evidence.

## Recent Achievements
- [x] **Launch**: Released v2.7.0 (Scanner, Runtime, VS Code Ext).
- [x] **Marketing**: Landing Page, Demo Script, Announcement.
- [x] **Crypto Audit**: Implemented `CryptoService` (HMAC-SHA256) and verified with tests.

## Active Decisions (ADR)
- **ADR-005 (Implicit)**: Use `node:crypto` via `nodejs_compat` for Workers to ensure cross-runtime signing compatibility.

## Roadmap (Next 3 Steps)
1.  **Orchestration**: Investigate Temporal/Kafka adapters for robust retries.
2.  **Advanced Policy**: Implement "Risk Scoring" (0-100) logic.
3.  **Governance**: Formalize `abs supervise` CLI command.

## Known Risks
- **Key Management**: `ABS_SECRET_KEY` rotation is not yet automated.
- **Performance**: HMAC signing adds <1ms latency (negligible).
