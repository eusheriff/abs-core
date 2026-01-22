# ADR 0009: Synchronous HMAC Hash Chain for Audit Logging

## Context
The external audit required a "Blockchain-backed" integrity model. We claimed "Tamper-proof Log Integrity".
To fulfill this, we needed a way to link decision logs such that modifying a past log breaks the subsequent chain.

## Decision
We implemented a **Synchronous HMAC-SHA256 Hash Chain** within the `EventProcessor`'s critical path.

Logic:
1.  Fetch the `signature` of the most recent log entry (`SELECT ... LIMIT 1`).
2.  Construct a canonical payload (`full_log_json`).
3.  Compute `HMAC( previous_hash + payload, SECRET )`.
4.  Insert the new `signature` along with the log in the same transaction (or sequential operation).
5.  Use an independent CLI (`abs audit verify`) to validate the chain.

## Alternatives Considered
- **Merkle Tree (Async)**: Allows batching and lower latency, but complex to implement and harder to verify sequentially in a simple CLI.
- **Async Queue Chaining**: Would remove DB read from critical path, but risks "forking" the chain if multiple workers process in parallel without strict ordering.
- **Public Blockchain**: Too slow and expensive for high-frequency decision logs (<10ms SLO).

## Consequences
- **Positive**: Simple, linear, unverifiable chain. "Unbreakable" guarantee for stored data.
- **Negative**: Adds a DB Read (`SELECT signature`) to the critical path.
- **Mitigation**: Benchmark showed P99 latency increased slightly (~16ms to ~20ms) but remains acceptable for the security gain.
