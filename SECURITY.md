# Security Policy

> This document outlines the security invariants, threat model, and vulnerability reporting process for ABS Core.

## Supported Versions

| Version | Supported | Notes |
| :-- | :-- | :-- |
| v2.0.x | :white_check_mark: | Scale Release (Current) |
| v1.0.x | :white_check_mark: | Enterprise Trust Release |
| v0.9.x | :x: | End of Life |

## Threat Model

ABS Core operates under a **Zero Trust** assumption regarding LLM outputs.
- **Trust Boundary**: The `EventProcessor` is the gatekeeper.
- **Untrusted Input**: Everything from LLMs (decisions, reasons, payloads) and **Generated Code**.
- **Trusted Component**: Policies (code), State Store (DB), and The Runtime itself.

### Specific Risks: Coding Agents
- **Indirect Prompt Injection**: Malicious code in a repo tricking the IDE Agent.
- **Excessive Agency**: `rm -rf /` or `git push --force` without approval.
- **Secret Exfiltration**: Generated code sending `.env` to third-party.


## OWASP Top 10 for LLM Applications (Coverage Matrix)

| ID | Risk | Mitigation in ABS Core | Implementation |
| :-- | :-- | :-- | :-- |
| **LLM01** | **Prompt Injection** | Input sanitization + pattern detection | `src/core/sanitizer.ts` |
| **LLM02** | **Insecure Output Handling** | Outputs must pass Policy Engine | `src/core/processor.ts` |
| **LLM08** | **Excessive Agency** | Human-in-the-Loop defaults, API Scopes | `src/api/middleware/auth.ts` |
| **LLM09** | **Overreliance** | Assume LLM is wrong until proven otherwise | Immutable Audit Log (Hash Chain) |

## Reporting a Vulnerability

Please report sensitive security issues via GitHub Security Advisories on this repository.
**DO NOT** open public issues for exploits.

