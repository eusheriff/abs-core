---
description: Verify task completion against requirements
---
# Workflow: /verify

Use this workflow to rigorously verify that a task has been completed according to user requirements and acceptance criteria. This is a "Double-Check" step before declaring success.

1. **Context Analysis**:
   - Read the original user request and the current `task.md`.
   - Identify all acceptance criteria (explicit and implicit).

2. **Self-Correction Checklist**:
   - create a checklist of requirements.
   - For each requirement, verify if the current codebase satisfies it.
   - If a requirement is NOT met, create a sub-task to fix it.

3. **Validation Actions**:
   - If the task involved code changes, run relevant tests.
   - If the task involved UI, checking for "Premium/Aesthetic" violations.
   - If the task involved security, run `abs scan` (if available).

4. **Final Report**:
   - Generate a brief summary of what was verified.
   - If everything is clear, proceed to `notify_user`.
