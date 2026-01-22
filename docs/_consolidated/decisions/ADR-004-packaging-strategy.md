# ADR-004: Scanner SDK vs Runtime Sidecar (Packaging)

## Status
Proposed (2026-01-20)

## Context
Currently, `abs-core` is a monolithic Cloudflare Worker that handles both ingestion (observability) and enforcement (blocking). This creates friction for users who just want "Shadow Mode" observability without changing their critical path or infrastructure (the "Sentry" model).

## Decision
We will split the product into two distinct integration packages:

1.  **`@abs/scan` (The "Scanner")**
    *   **Role**: Passive Observability SDK.
    *   **Language**: Node.js / Python / Go.
    *   **Behavior**: Asynchronous, non-blocking HTTP POST of AI events to ABS Cloud.
    *   **Value**: Audit logs, PII detection, Shadow evaluation.

2.  **`@abs/runtime` (The "Firewall")**
    *   **Role**: Active Enforcement Sidecar.
    *   **Protocol**: MCP (Model Context Protocol) or HTTP Middleware.
    *   **Behavior**: Synchronous intercept of AI calls.
    *   **Value**: Blocking injection, Human-in-the-loop, Real-time Policy enforcement.

## Consequences
- **Positive**: "Land & Expand" sales motion becomes viable (`npm install @abs/scan` is low risk).
- **Positive**: Clearer separation of concerns.
- **Negative**: Need to maintain two client libraries.
