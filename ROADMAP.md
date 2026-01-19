# Roadmap

This roadmap focuses on operational discipline and safety, not marketing features.
We prioritize reliability over expanded scope.

## v0.6 — Resilience Layer
- **Idempotency**: Native support for `Correlation-ID` de-duplication at the database level.
- **Safe Replay**: Tooling to re-run past events against new policies without executing side-effects (Dry Run).

## v0.7 — Concurrency & Scale
- **Locking**: Distributed locking for same-entity events (prevent race conditions on Ticket #123).
- **Queue Drivers**: Native support for SQS/Redis consumer patterns beyond HTTP webhooks.

## v0.8 — Extensibility
- **OPA Support**: Optional adapter to use Open Policy Agent (Rego) instead of TypeScript policies.
- **Custom Providers**: Plugin system for bespoke LLM or deterministic providers.

## v1.0 — Stability (LTS)
- **Frozen Invariants**: Core logic locked.
- **Formal Verification**: Mathematical proof of the core state machine.
- **Production Readiness**: Full telemetry integration (OpenTelemetry).
