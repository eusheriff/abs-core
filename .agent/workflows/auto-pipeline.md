---
description: Master Pipeline: Plan -> Consult -> Execute -> Verify
---
# Workflow: /auto-pipeline

This is the **Master Workflow** that executes the full Autonomous Protocol.

## 1. Phase: Initialization (Rehydrate)
- Read `PROTOCOL.md` and `STATE.md`.
- Create/Update `task.md`.
- **Constraint**: Must identify `current_objective` clearly.

## 2. Phase: Architecture (Consult)
- **Action**: Invoke OpenCode.
  - `opencode consultant "I am planning to do X. Are there architectural risks?"`
- **Output**: Incorporate feedback into `implementation_plan.md`.

## 3. Phase: Execution (Governed)
- **Loop**:
  1. Check `abs-governance` policy.
  2. Write Code (`write_to_file`).
  3. **Audit**: Log explicit decisions to WAL.
  - *On Error*: Switch to `/debuger`.

## 4. Phase: Verification (Double-Check)
- **Action**: Execute `/verify`.
- **Checklist**:
  - [ ] Lint passed?
  - [ ] Tests passed?
  - [ ] Security scan clean?
  - [ ] Aesthetics (if UI) premium?

## 5. Phase: Handover
- Update `WORKLOG.md`.
- Notify User.
