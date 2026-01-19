# Security Policy

We take security seriously, especially given the risks inherent in LLM-driven applications.
This project follows the **OWASP LLM Top 10** guidelines.

## Threat Model & Mitigations

### 1. Prompt Injection (LLM01)
*   **Risk**: Malicious inputs manipulating the LLM to bypass rules or leak data.
*   **Mitigation**:
    *   Strict Input Sanitization (stripping control characters/markdown).
    *   XML Tagging for prompt Context boundaries.
    *   **Policy Gate**: Even if the LLM is jailbroken to suggest "DELETE DB", the Policy Engine (deterministic code) will likely `DENY` the action if it's not whitelisted.

### 2. Insecure Output Handling (LLM02)
*   **Risk**: LLM returning malicious code or broken JSON that exploits the executor.
*   **Mitigation**:
    *   Strict Schema Validation (Zod) on all LLM outputs.
    *   JSON parsing in sandbox/safe mode.
    *   No `eval()` on LLM output.

### 3. Excessive Agency (LLM08)
*   **Risk**: LLM taking damaging actions (e.g., deleting data, sending spam).
*   **Mitigation**:
    *   **Hard-Coded Action Whitelist** in Policy Engine.
    *   Kill Switch enabled via Environment Variables.
    *   Audit Logging of every intent before execution.

## Reporting Vulnerabilities
If you discover a security vulnerability, please do NOT open a public issue.
Email `security@oconnector.com` (mock email for OSS demo) or message the maintainer directly.

## Audit Status
*   **Last Master Audit**: v0.5 (2026-01-19) - Status: **PASSED**
*   See `docs/AUDIT_MASTER_v0.5.md` for full report.
