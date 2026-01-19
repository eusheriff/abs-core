# Contributing to ABS Core

Thank you for your interest in contributing!
We are building a **governance-first** runtime, and quality/safety is our top priority.

## Handrails 🛡️

Before submitting a PR, please read [INVARIANTS.md](../INVARIANTS.md).
Any Code Change that violates these invariants will be rejected:
1.  Bypassing the Policy Gate.
2.  Executing actions without logging.
3.  Removing Type Safety (no `any`).

## Development Flow

1.  **Fork & Clone**:
    ```bash
    git clone ...
    npm install
    npm run dev
    ```

2.  **Make Changes**:
    - If adding a Feature: Create a `feat/` branch.
    - If fixing a Bug: Create a `fix/` branch.
    - If refactoring: Create a `chore/` or `refactor/` branch.

3.  **Test**:
    - We currently value manual verification via `abs simulate` or `curl`.
    - Ensure `npm run dev` starts without errors.
    - Ensure no Lint warnings are introduced.

## Pull Request Process

1.  Describe **Why** you are making the change.
2.  Describe **How** it affects the Decision Integrity.
3.  Link related Issues.
4.  Wait for the Maintainer review.

## Code of Conduct

Be invalidly kind. We are professionals building professional tools.
Respect, patience, and technical rigor are expected.
