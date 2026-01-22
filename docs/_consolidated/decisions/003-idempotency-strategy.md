# ADR-003: Idempotency Strategy - Database Constraints vs. Durable Objects

## Status
Accepted

## Context
As we implement Vector 5 (Partial Failures & Idempotency), we need a robust mechanism to guarantee that the same event is not processed multiple times by the AI Decision Engine. Duplicate processing incurs unnecessary LLM costs and risks creating duplicate side-effects (e.g., duplicate alerts or actions).

The application runs on Cloudflare Workers, which suggests **Durable Objects (DO)** as a natural candidate for handling state and serialization. However, we are also using a relational database (SQLite/D1) via an adapter.

We evaluated two approaches:
1. **Durable Objects**: Using a DO per tenant or entity to serialize requests and maintain a "processed" state in memory/storage.
2. **Database Constraints**: Leveraging the ACID properties of the SQL database with `UNIQUE` constraints on `event_id`.

## Decision
We decided to implement **Database Constraints (Optimistic Concurrency)** as the primary mechanism for idempotency at this stage.

### Rationale
1. **Simplicity**: Adding Durable Objects introduces significant infrastructure complexity (stub management, billing, state migrations). Database constraints are a standard, well-understood pattern.
2. **Consistency**: The `decision_logs` table is already the source of truth for audit traits. Using it for idempotency ensures that if a decision exists, it is persisted.
3. **Performance**: For the expected initial load, the overhead of handling `UNIQUE constraint failed` exceptions is lower than the latency of ensuring strong consistency via a distributed object coordinator for every request.
4. **Portability**: This approach is not locked into Cloudflare-specific primitives (DOs), making it easier to port the core logic to other environments (e.g., Docker/Node.js with Postgres) if needed, as verified by our local tests.

## Implementation Details
- A `UNIQUE INDEX` was added to `decision_logs(event_id)`.
- The `EventProcessor` performs a "soft check" (SELECT) first for optimization.
- The `logDecision` method attempts an INSERT.
- If a race condition occurs (concurrent requests pass the soft check), the database rejects the second INSERT.
- The application catches this specific error, queries the winning record, and returns a `processed_duplicate` status.

## Consequences
### Positive
- Zero additional infrastructure cost.
- Reduced code complexity (no DO class management).
- "First-writer-wins" guarantee provided by the database engine.

### Negative
- Higher database contention under extreme write loads for the same keys (though unlikely for unique event IDs).
- Reliance on database error strings (e.g., checking for "UNIQUE constraint failed") which can vary between drivers, though abstracted in our adapter.

## Future Considerations
If the system scales to millions of concurrent events per second or requires complex, stateful multi-step transactions that span minutes, we will re-evaluate Durable Objects or a Redis-based locking mechanism.
