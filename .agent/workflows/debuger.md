---
description: Systematic Debugging: Hypothesis -> Evidence -> Fix -> Verify
---
# Workflow: /debuger

Use this workflow to systematically debug issues using the scientific method. Avoid "shotgun debugging".

## 1. Triage & Replication
- **Objective**: Reproduce the issue consistently.
- Action: Request logs, screenshots, or reproduction steps.
- Action: If in a test environment, create a failing test case (`test/repro_issue.test.ts`).

## 2. Hypothesis Generation
- List 3-5 potential root causes.
- Rank them by probability.
- *Example*:
  1. Frontend not sending token (High)
  2. Backend rejecting token (Medium)
  3. Database timeout (Low)

## 3. Evidence Gathering (The "Probe")
- Check logs (`logs/`, `console`, `network`).
- Add *temporary* debug logging if necessary (mark with `// DEBUG: REMOVE ME`).
- **Stop Code**: Do not write fix code yet. Confirm the hypothesis first.

## 4. Remediation (The Fix)
- Apply the *minimal* change to fix the root cause.
- Avoid refactoring unrelated code during a debug session.

## 5. Verification & Cleanup
- Run the reproduction test (must pass).
- Remove all `// DEBUG` logs.
- Run `abs scan` to ensure no security regression.
