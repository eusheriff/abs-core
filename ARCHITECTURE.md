# Architecture & Integration Guide

This document is the "serious integration manual" for architects and engineers integrating `abs-core` into production systems.

## 1. Module Structure (Monorepo)

The project is structured into three distinct packages to separate concerns:

- **`@abs/core`**: The Runtime. Handles execution, policy gating, and logging.
- **`@abs/scan`**: The Scanner. Static analysis tool to find governance violations (Shift Left).
- **`@abs/cli`**: Unified CLI (`abs`) to orchestrate scan and runtime.

## 2. Runtime Overview
**ABS Core** acts as a **Safety Middleware** (or Sidecar) between your reasoning engine (LLM) and your execution layer (APIs, DBs).

It converts probabilistic suggestions into deterministic, governed actions.

| Component | Role | Responsibility |
| :--- | :--- | :--- |
| **Provider (LLM)** | Reasoning | Analyzes context and *proposes* an action. |
| **Policy Engine** | Governance | Evaluates the proposal against hard-coded invariants. |
| **Decision Log** | Audit | Immutably records the *intent* and the *decision*. |
| **Executor** | Action | Performs the side-effect only if Allowed. |

## 2. The Canonical Flow

Every operation in an ABS follows this strict sequence:

1.  **Event Ingestion**: System receives a signal (Webhook, Cron, User Input).
2.  **Context Assembly**: State is gathered (e.g., User Profile, Ticket Status).
3.  **Proposal (Probabilistic)**: LLM suggests: `Proposal = { action: 'refund', params: { amount: 50 }, confidence: 0.9 }`.
4.  **Proposal Validation**: Schema check (Zod).
5.  **Policy Evaluation (Deterministic)**: `Policy(Proposal) -> ALLOW | DENY | REVIEW`.
6.  **Decision Logging (Immutable)**: Result is written to DB. **(Stop here if DENY/FAIL)**.
7.  **Execution (Side-Effect)**: `Executor.run(action)`.
8.  **Execution Logging**: Consequence is written to DB.

```mermaid
sequenceDiagram
    participant Source
    participant Runtime
    participant LLM
    participant Policy
    participant DB
    participant API
    
    Source->>Runtime: Event
    Runtime->>LLM: Context
    LLM-->>Runtime: Proposal
    Runtime->>Policy: Evaluate(Proposal)
    Policy-->>Runtime: Decision (ALLOW)
    Runtime->>DB: INSERT Decision Log
    
    rect rgb(200, 255, 200)
    Note over Runtime, API: Execution Boundary
    Runtime->>API: Execute Action
    end
    
    Runtime->>DB: UPDATE Execution Status
```

## 3. Core Contracts

### Event Envelope
Standard wrapper for all inputs.
```typescript
interface EventEnvelope {
  event_id: string;
  event_type: string; // e.g. "ticket.created"
  payload: any;
}
```

### Decision Proposal
The output of the LLM.
```typescript
interface DecisionProposal {
  recommended_action: string;
  action_params: Record<string, any>;
  confidence: number;
  explanation: { rationale: string };
}
```

### 3. Log Contracts (Decision & Execution)
The `Decision Log` is the **System of Record**.

#### Tamper Resistance Model (Immutability)
To guarantee "Audit Integrity", the persistence layer adheres to the following constraints:
- **Append-Only**: Logs are `INSERT` only.
- **No Delete**: No API or driver method exists to `DELETE` a decision log.
- **Constrained Updates**: `UPDATE` is allowed *only* on the `execution_status` and `execution_response` fields (to transition from `PENDING` to `SUCCESS/FAIL`).
- **Frozen Context**: The `decision_proposal` and `input_snapshot` JSON blobs are **never** modified after the initial insert.

```typescript
// Interface Definition
export interface DecisionLog {
  decision_id: string;      // Immutable
  tenant_id: string;        // Immutable
  timestamp: string;        // Immutable
  // ...
  // decision_id: string; // uuid - This line was a duplicate and is now commented out or removed based on the instruction's intent.
  event_id: string;
  proposed_action: string;
  policy_decision: 'ALLOW' | 'DENY' | 'ESCALATE';
  policy_rule_id: string;
  rationale: string;
  inputs_hash: string;
  created_at: string; // ISO8601
}
```

### Execution Log
The record of what actually happened.
```typescript
interface ExecutionLog {
  decision_id: string;
  status: 'EXECUTED' | 'SKIPPED_POLICY' | 'FAILED';
  executor: string;
  latency_ms: number;
  error?: string;
  executed_at: string; // ISO8601
}
```

### 4. Human-in-the-Loop (HITL) Contract
When `policy_decision` is `ESCALATE`, the system enters a suspended state.

**Operational Flow:**
1.  **Notification**: System emits `event.escalation_required` via configured webhook (e.g., Slack/PagerDuty).
2.  **Review**: Human accesses the Decision Log (via Enterprise Dashboard or CLI).
3.  **Resolution**: Human submits a `ReviewDecision` (Approve/Reject) signed with their ID.
4.  **Resumption**: The Runtime receives the review and transitions to `EXECUTING` or `DROPPED` context.

*Note: This flow ensures HITL is not a "bypass button" but a tracked audit event itself.*

## 4. Integration Patterns

### A. The "Gatekeeper" Middleware (Recommended)
`abs-core` sits between your Chatbot and your Backend.
- Chatbot sends intent to ABS.
- ABS decides.
- ABS executes or returns "Blocked" to Chatbot.

### B. The "Sidecar" Auditor
`abs-core` runs alongside a legacy system.
- Legacy system proposes action.
- ABS logs and validates.
- Legacy system executes only on allowance.

## 5. Architectural Constraints (Forbidden)

1.  **Direct-to-Execution**: The LLM must NEVER call an API directly. It must return a JSON Proposal.
2.  **Bypassing the Log**: Execution code must depend on a successful Log ID.
3.  **Dynamic Policy**: Policies must be code (TypeScript) or Versioned Config. They cannot be hallucinated by the LLM.
