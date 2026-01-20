# ABS Core
> **Autonomous Business System (Runtime)**
> `v2.0.0`

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![CI](https://github.com/eusheriff/abs-core/actions/workflows/ci.yml/badge.svg)](https://github.com/eusheriff/abs-core/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/Tests-Passing-success)](packages/core/test)
[![Security](https://img.shields.io/badge/Security-TruffleHog%20%2B%20Trivy-green)](https://github.com/eusheriff/abs-core/actions)

> **ABS Core is not an agent framework.**
> It is a governed runtime that prevents probabilistic models from executing unbounded actions.

**abs-core** is an open-source **reference runtime** designed to govern autonomous business decisions.
It acts as a safety middleware between your LLM (Reasoning) and your Execution Layer (Actions).

🔎 *Confused by the acronym? See [Disambiguation](GLOSSARY.md).*  
📜 *Read our [Project Philosophy](PROJECT_PHILOSOPHY.md).*  
🚀 *New here? Start with [Getting Started Guide](GETTING_STARTED.md).*

### Why it exists
> **LLMs are probabilistic. Business execution must not be.**
> ABS Core bridges that gap.

## What is ABS?
*   A runtime that enforces **Decision Integrity** for autonomous business processes.
*   The LLM **Proposes** actions.
*   The Policy Engine **Decides** (Allow/Deny).
*   The System **Logs** (Immutable Audit Trail).
*   Only then, the System **Executes**.

## Non-Goals
To avoid confusion, this project is explicitly:
*   **NOT** a General Purpose Agent Framework (like AutoGPT).
*   **NOT** a Chatbot Framework.
*   **NOT** Robotic Process Automation (RPA).
*   **NOT** a promise of "Full Autonomy" without supervision.

## Architecture (The Governance Loop)

```mermaid
graph LR
    A[Event] --> B(LLM Proposal)
    B --> C{Policy Gate}
    C -- DENY --> D[Stop & Log]
    C -- ALLOW --> E[Decision Log]
    E --> F[Execute Action]
    F --> G[Execution Log]
```

Note: The **Decision Log** happens *strictly before* Execution. If the DB insert fails, the action is never attempted.

## 🚀 Getting Started (Free Community Edition)

The **ABS Scanner** (`@abs/scan`) is a lightweight "Sentry for LLMs" that runs locally in your application. It audits your AI's decisions without blocking execution.

### Installation

```bash
npm install @abs/scan
```

### Usage (Shadow Mode)

Embed the scanner in your existing TS/JS application to visualize what *would* have been blocked.

```typescript
import { ABS } from '@abs/scan';

// 1. Initialize local scanner
const abs = new ABS({ mode: 'scanner' });

// 2. Log AI interactions (Non-blocking)
// This will analyze against local policies and print violations to console
await abs.log({
  input: "Delete production database",
  output: "Executing DELETE schema...",
  policy: "strict-safety"
});
```

## 🛡️ Enterprise Runtime (Paid)

Found vulnerabilities? Upgrade to the **ABS Runtime** to block them in real-time.

**ABS MCP Server** integrates directly with your IDE or Agent workflow to enforce policies *before* execution.

| Feature | Community Scanner | Enterprise Runtime |
| :--- | :---: | :---: |
| **Audit/Logging** | ✅ Local | ✅ Centralized |
| **Policy Check** | ✅ Dry-Run | ✅ Enforcement |
| **Real-time Blocking** | ❌ | ✅ |
| **Integration** | SDK | MCP / Sidecar |

👉 **[Get Enterprise Access](https://oconnector.tech/abs)** to actuate your governance layer.

---

## 🗺️ Repository Structure (Code Map)
- **Scanner SDK**: [`packages/scan/`](packages/scan/) (The community tool)
- **Core Runtime**: [`packages/core/`](packages/core/) ( The governance logic)
- **Policies**: [`examples/policies/`](examples/policies/) (Open source rule definitions)

---

## 🛡️ Testing & Assurance

ABS Core is built with a "Test-First" philosophy for critical paths.

```bash
# Run the full suite (Idempotency, Observability, VCR)
cd packages/core
npm run test
```

Key suites:
- **Idempotency**: Verifies race condition handling and DB constraints.
- **Forensic**: Validates `trace_id` lineage and latency breakdown.
- **VCR**: Ensures deterministic LLM replays development.

---

## Security Posture
We follow the **OWASP Top 10 for LLM Applications**.
*   **LLM01 (Prompt Injection)**: Inputs are sanitized and strictly delimited.
*   **LLM08 (Excessive Agency)**: Actions are whitelisted in the Policy Engine.

See [SECURITY.md](SECURITY.md) for full details.

## Governance
This runtime enforces invariants that cannot be bypassed by the LLM.
See [INVARIANTS.md](INVARIANTS.md).

## 📚 Policy Library

See real-world examples in [`examples/policies/`](examples/policies/):
- **Finance**: [Approval Matrix](examples/policies/finance_approval.json) ($10k+ requires CFO).
- **HR**: [PII Redaction](examples/policies/hr_pii_protection.json) (Protect employee data).

## License

**Open Core Component (`@abs/scan`)**: [MIT](LICENSE)  
**Enterprise Runtime (MCP)**: [Commercial License](LICENSING.md)

&copy; 2026 OConnector. All rights reserved.
