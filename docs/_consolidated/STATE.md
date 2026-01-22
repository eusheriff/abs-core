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
- [x] **Advanced Policy**: Implemented "Risk Scoring" (0-100) and Thresholds (30/80).
- [x] **Semantic Telemetry (v3.1)**: Implemented `IntentTracer` and `SessionManager` (Verified).
- [x] **Audit Remediation (P0)**: Standardized Licensing (Apache-2.0), Security Model (Hash Chain), and Qualified Marketing Claims.
- [x] **Fix VS Code Scan**: Resolved 404/401 API errors (v0.0.11) and added Smart Scan (v0.0.12).
- [x] **Marketplace DNS**: Verified `abscore.app` domain for Visual Studio Marketplace.

## Active Decisions (ADR)
- **ADR-005 (Implicit)**: Use `node:crypto` via `nodejs_compat` for Workers to ensure cross-runtime signing compatibility.
- **ADR-006 (Implicit)**: VS Code "Smart Scan" (limits to 100 config files) vs MCP "Enterprise" (unlimited local).

## Roadmap (Next 3 Steps)
- **Immediate**:
  - [x] ~~Audit Remediation (P0/P1/P2/P3)~~ (DONE)
  - [x] **Formalize `abs supervise`** (CLI)
  - [x] **Deploy to Production** (Workers) - `abscore.app` ✅
  - [x] **Implement VS Code Sidebar GUI** (ArmorIQ Style)
  - [x] **Verify VS Code Extension** (User Acceptance - Scan OK)
  - [x] **Publish VS Code Extension** (Ready for Upload v0.0.16)

## Known Risks
- **Key Management**: `ABS_SECRET_KEY` rotation is not yet automated.
- **Performance**: HMAC signing adds <1ms latency (negligible).
