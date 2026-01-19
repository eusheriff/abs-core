# Security Policy

> This document outlines the security invariants, threat model, and vulnerability reporting process for OConnector ABS Core.

## Supported Versions

| Version | Supported | Notes |
| :-- | :-- | :-- |
| v1.0.x | :white_check_mark: | Enterprise Trust Release (Current) |
| v0.9.x | :alarm_clock: | End of Life (Prototype) |

## Threat Model

ABS Core operates under a **Zero Trust** assumption regarding LLM outputs.
- **Trust Boundary**: The `EventProcessor` is the gatekeeper.
- **Untrusted Input**: Everything from LLMs (decisions, reasons, payloads).
- **Trusted Compopnent**: Polices (code), State Store (DB), and The Runtime itself.

## OWASP Top 10 for LLM Applications (Coverage Matrix)

| ID | Risk | Mitigation in ABS Core | Implementation |
| :-- | :-- | :-- | :-- |
| **LLM01** | **Prompt Injection** | Strict Separation of Control/Data. Unescaped variables flagged by Static Analysis. | `src/core/schemas.ts` (Validation) |
| **LLM02** | **Insecure Output Handling** | Outputs are not executed blindly. Must pass Policy Engine. | `src/core/processor.ts` (Policy Check) |
| **LLM08** | **Excessive Agency** | "Human-in-the-Loop" defaults. Capabilities restricted by API Scopes. | `src/api/middleware/auth.ts` |
| **LLM09** | **Overreliance** | "By Design": We assume the LLM is wrong until proven otherwise. | Immutable Audit Log (Hash Chain) |

## Reporting a Vulnerability

Please report sensitive security issues via email to security@oconnector.com.
**DO NOT** open public issues for exploits.
