# Human-in-the-Loop (HITL) Operations

This document defines the operational protocol for handling `ESCALATE` decisions.

## 1. The Trigger
A Policy Rule returns `ESCALATE` when:
- Confidence is below threshold (< 0.8).
- High-risk action (e.g., Transfer > $5k).
- Anomaly detected (New IP address).

## 2. The Protocol
Unlike "chatbots", ABS stops and waits.

### Step A: Notification
The Runtime emits a `decision.escalated` event.
- **Payload**: `decision_id`, `reason`, `proposal_summary`.
- **Channel**: Webhook to PagerDuty / Slack / Dashboard.

### Step B: The Review Interface
The Admin opens the Governance Dashboard (`packages/dashboard`).
1. Navigates to **"Pending Reviews"**.
2. Inspects:
   - **Input**: User request.
   - **Proposal**: What the AI wants to do.
   - **Risk**: Why it stopped.

### Step C: Resolution
The Admin MUST sign the resolution.
```json
{
  "reviewer_id": "user_123",
  "decision": "APPROVE", 
  "override_reason": "Verified by phone call"
}
```

### Step D: Resumption
The Runtime receives the Signed Resolution.
- **If APPROVED**: Transitions state to `EXECUTING`.
- **If REJECTED**: Transitions state to `DROPPED` and logs reasoning.

## 3. Anti-Patterns (Prohibited)
- **Blind Approval**: Building a UI with a "Approve All" button.
- **Bypass**: Modifying the database manually to change status to `SUCCESS`.
