# System Invariants (Decision Integrity)

In `abs-core`, **Autonomy is a privilege, Governance is a requirement.**
These invariants are hard-coded into the runtime and must NOT be bypassed.

## I. The Governance Gate
> **"No Action without Policy Authorization."**

*   **Invariant**: Every `executor.execute()` call MUST be preceded by a `policy.evaluate()` call returning `status: 'ALLOW'`.
*   **Enforcement**: Use `src/core/policy.ts` engine. Direct execution from LLM recommendation is forbidden.
*   **Behavior**: If Policy returns `DENY` or `MANUAL_REVIEW`, the system logs the intent but DOES NOT execute the side-effect.

## II. The Immutable Audit Trail
> **"If it wasn't logged, it didn't happen (and shouldn't happen)."**

*   **Invariant**: 100% of decisions MUST be persisted to `decision_logs` BEFORE any execution attempt.
*   **Enforcement**: Transactional logic in `src/api/routes/events.ts`.
*   **Properties**: Logs are append-only. Updates are allowed only for `execution_status` (idempotency).

## III. Separation of Powers
> **"The AI Proposes, The Policy Disposes."**

*   **Invariant**: The LLM (Provider) creates a `Proposal`. It has NO authority to execute.
*   **Invariant**: The Policy Engine creates a `Decision`. It has authority to block.
*   **Invariant**: The Executor performs the `Side-Effect`. It has no intelligence, only capability.

## IV. Fail-Safe Defaults
> **"When in doubt, do nothing."**

*   **Invariant**: System defaults to `DENY` on errors, timeouts, or low confidence (< 0.8 by default).
*   **Behavior**: An unhandled exception in the decision loop results in NO Action and an Error Log.

---
**Note to Contributors**: Any Pull Request that weakens these invariants will be rejected without review.
