# Security & Integrity Model

## Overview

ABS Core is designed as a "Immune System" for AI Agents, operating on a strict **Zero Trust** architecture. This document details the security model, specifically the "Blockchain-backed Integrity" mechanism used in our Audit Logs.

## 1. Governance Model

### Zero Trust Execution
*   **Default Deny**: All actions are blocked unless explicitly allowed by a policy.
*   **Identity**: Every request must be authenticated via `ABS_TOKEN` (Bearer).
*   **Isolation**: The Runtime (Enforcement) is physically separated from the Scanner (Observation).

## 2. Integrity Model ("Blockchain-backed")

Our "Forensic Logs" are secured using a **Cryptographic Hash Chain**, guaranteeing tamper-evidence for all decisions.

### Mechanism: Hash Chain
Instead of a simple database append, each log entry is cryptographically linked to the previous one.

`Hash(N) = HMAC-SHA256( Entry(N) + Hash(N-1), SECRET_KEY )`

*   **Anchor**: The first entry (Genesis) serves as the trust anchor.
*   **Chaining**: Modification of any past entry ($N-1$) effectively invalidates the signature of all subsequent entries ($N, N+1, ...$).
*   **Verification**: The `abs audit verify` command re-calculates the chain from Genesis to Head to prove integrity.

### Why "Blockchain-backed"?
While not running on a public permissionless chain (like Bitcoin) per default for latency reasons, the **data structure** is identical to a blockchain (Merkle/Hash Chain). 
*   **Enterprise Tier**: Can be configured to periodically anchor the "Head Hash" to a public blockchain (e.g., Ethereum/Polygon) for non-repudiation by the vendor.

## 3. Threat Model

| Threat | Mitigation | Status |
| :--- | :--- | :--- |
| **Tampered Logs** | Hash Chain + HMAC Signatures | ✅ Implemented |
| **Prompt Injection** | Input Sanitization + Policy Engine | ✅ Implemented |
| **Unauthorized Access** | Bearer Token + RBAC | ✅ Implemented |
| **DDoS / Flooding** | Cloudflare Edge + Rate Limiting | ✅ Native |

## 4. Latency & Performance

*   **Fast Path (<10ms)**: Policy evaluation happens in-memory on the Edge (Cloudflare Workers).
*   **Async Logging**: The cryptographic signing and database storage happen asynchronously, not blocking the decision response.
