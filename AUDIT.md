# Audit Methodology: ABS Core v0.5

This document defines the scope, criteria, and evidence required to claim the "Audited" status of ABS Core.

## 1. Scope
The audit covers the **Governance Runtime** (`packages/core`) and its ability to enforce the security invariants defined in `INVARIANTS.md`.
- **Target**: `src/core/machine.ts`, `src/api/routes/events.ts`.
- **Excluded**: UI Components, Example implementations outside `packages/core`.

## 2. Methodology
The audit process follows a "White Box" approach, verifying code paths against logical threats.

### Threat Model (Focus Areas)
| ID | Threat | Mitigation | Status |
|---|---|---|---|
| **T01** | **Direct Bypass** | LLM output is executed without Policy evaluation. | **PASSED** |
| **T02** | **Ghost Action** | Action executed without a Decision Log entry. | **PASSED** |
| **T03** | **Prompt Injection** | Malicious prompt overrides Policy constraints. | **PASSED** |

## 3. Evidence of Control

### T01 - Direct Bypass Prevention
**Invariant**: No Execution without Policy.
- **Verification**: The `Executor` class is only instantiated *after* a valid `PolicyDecision` object is present in the `Context`.
- **Code Reference**: `src/core/machine.ts` (State: `evaluating_policy` -> `executing_action`).

### T02 - Ghost Action Prevention
**Invariant**: Log Before Execute.
- **Verification**: The database unique constraint on `decision_id` requires a log entry before the execution state transition can occur.
- **Code Reference**: `src/api/routes/events.ts` (Sequence: `decision_log.insert` -> `executor.run`).

### T03 - Prompt Injection Resilience
**Invariant**: Deterministic Policy Gate.
- **Verification**: The `SimplePolicyEngine` evaluates the *structured proposal* (JSON), not the raw prompt. Injection in the prompt string does not alter the policy logic condition (e.g., `amount > 1000`).
- **Code Reference**: `src/core/policy.ts` (Logic executes on typed `DecisionProposal` scalars).

## 4. Replication
To verify these claims locally:
```bash
# 1. Run the Scanner to check for code-level bypasses
npx abs scan .

# 2. Run Invariant Tests (Simulated Attacks)
npm run test:invariants
```

## 5. Status
**Current Version**: v0.5-audited
** Auditor**: Internal Technical Review (Automated + Manual)
** Date**: 2026-01-19
