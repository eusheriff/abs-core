# Technical Review: OConnector ABS Core

**Date:** 2026-01-19
**Version:** v0.5-audited
**Repository:** [github.com/eusheriff/abs-core](https://github.com/eusheriff/abs-core)
**Reviewer Role:** Technical Reviewer

---

## 1. Introduction
**OConnector ABS Core** is a specialized runtime designed to govern Autonomous Business Systems (ABS). Unlike generic agent frameworks that prioritize capability and autonomy, ABS Core solves the "Decision Integrity" problem: how to ensure that a probabilistic model (LLM) triggers executing actions only when strictly compliant with deterministic business policies.

It is positioned not as a chatbot builder, but as a **Governance Middleware** (or Sidecar) that sits between the reasoning engine and the execution layer.

## 2. Architecture Overview
The system implements a strict, closed loop for decision governance, as described in `ARCHITECTURE.md` and enforced by the code in `packages/core`.

**The Canonical Flow:**
1.  **Event**: Ingestion of a signal (JSON payload).
2.  **Proposal**: An LLM (via Adapter) suggests an action + confidence score.
3.  **Policy Gate**: A deterministic engine evaluates the proposal against hard-coded invariants.
    *   *Critical Invariant*: No action is executed without an explicit `ALLOW` decision.
4.  **Decision Log**: The intent and the policy result are immutably logged *before* any side-effect occurs.
5.  **Execution**: The `Executor` runs the action only if the Policy Gate passed.

**Key Design Choice**: Separation of "Reasoning" (Probabilistic/LLM) from "Policy" (Deterministic/Code). The model cannot overwrite the policy.

## 3. Stack & Structure
The project has been refactored into a **Monorepo** structure to separate concerns clearly:

*   **Language**: TypeScript (Node.js/Cloudflare Workers compat).
*   **Core Runtime** (`packages/core`):
    *   **Framework**: `Hono` for the API layer.
    *   **State Machine**: `XState` for process lifecycle.
    *   **Validation**: `Zod` for contract enforcement.
    *   **Persistence**: `better-sqlite3` (Local) / D1 (Cloudflare contracts).
*   **Scanner** (`packages/scan`):
    *   A static analysis tool using `commander` and AST/Regex heuristics to detect unsafe patterns (e.g., direct LLM-to-execution calls).
*   **CLI** (`packages/cli`):
    *   Unified entry point (`abs`) orchestrating both runtime serving and scanning.

## 4. Security & Governance
The architecture actively mitigates risks identified in the **OWASP LLM Top 10**:

*   **LLM01 (Prompt Injection)**: Mitigated by the **Policy Gate**. Even if the LLM is tricked into proposing a malicious action (e.g., "delete DB"), the deterministic policy (which acts on the *proposal*, not the prompt) will block it if the action is not allow-listed or if parameters violate constraints.
*   **LLM08 (Excessive Agency)**: Addressed by the **Executor** pattern. The LLM has no direct access to `fetch` or database drivers; it can only emit JSON proposals.
*   **Auditability**: The strict `Decision Log -> Execution` sequence ensures that every executed action is traceable to a specific decision event, preventing "ghost interactions".

## 5. Author's Value Add
The contribution stands out in its **Architectural Discipline**:
*   **Zero-Config Security**: The mock provider and strict policies work out-of-the-box (`npm run dev`), reinforcing the governance-first philosophy.
*   **Shift-Left Governance**: The introduction of `@abs/scan` brings governance checks to the developer's local environment, educating users on unsafe patterns before deployment.
*   **Documentation as Contract**: Files like `INVARIANTS.md`, `SECURITY.md`, and `PROJECT_PHILOSOPHY.md` are treated with the same importance as code, defining the project's rigid stance on safety.

## 6. Suggestions for Future (v0.6+)
Based on the current codebase, the following evolution paths are recommended:

*   **Policy Packs**: Extract the hardcoded `SimplePolicyEngine` into templated "Policy Packs" (e.g., *FinancialApproval*, *PII_Redaction*) to accelerate adoption.
*   **Enhanced Observability**: Expose structured metrics (Prometheus/OpenTelemetry) for `Decision_Allow_Rate` vs `Decision_Deny_Rate`.
*   **Expanded Scanner Rules**: Move beyond regex heuristics in `@abs/scan` to robust AST parsing for TypeScript/Python to detect subtle data leaks.
