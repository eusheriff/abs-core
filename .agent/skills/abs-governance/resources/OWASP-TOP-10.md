# OWASP Top 10 for LLM Applications (Governance Edition)

Use this guide to mitigate security risks in generated code.

## LLM01: Prompt Injection
*   **Risk**: Attacker manipulates LLM output via crafted input.
*   **Mitigation**:
    *   Separate data from instructions.
    *   Use parameterized queries (e.g., `db.prepare(sql).bind(input)`).
    *   Validate input length and character set.

## LLM02: Insecure Output Handling
*   **Risk**: LLM output is executed blindly (XSS, RCE).
*   **Mitigation**:
    *   Treat LLM output as **UNTRUSTED USER INPUT**.
    *   Encode output before rendering (HTML/SQL/Shell).
    *   **NEVER** use `eval()`, `exec()`, or `innerHTML` with LLM content.

## LLM03: Training Data Poisoning
*   **Risk**: Model learns from malicious data.
*   **Mitigation**: Verify data provenance (ABS Hash Chain).

## LLM04: Model Denial of Service
*   **Risk**: Expensive queries exhaust resources.
*   **Mitigation**: Implement rate limiting and context window limits.

## LLM05: Supply Chain Vulnerabilities
*   **Risk**: Using compromised models or plugins.
*   **Mitigation**: Verify signatures of models and tools (ABS Identity).

## LLM06: Sensitive Information Disclosure
*   **Risk**: LLM reveals PII or secrets.
*   **Mitigation**:
    *   **ABS Policy**: `pii_filter: true`.
    *   Sanitize output buffers.

## LLM07: Insecure Plugin Design
*   **Risk**: Plugins take dangerous actions without confirmation.
*   **Mitigation**: Use ABS `verify-completion` and `Action Confirmation`.

## LLM08: Excessive Agency
*   **Risk**: Agent does more than intended (e.g., deletes all files).
*   **Mitigation**:
    *   **ABS Governance**: Enforce `capabilities` limits in `profile.yaml`.
    *   Least Privilege: Agent token should not have Admin access.

## LLM09: Overreliance
*   **Risk**: Accepting hallucinated code as fact.
*   **Mitigation**: Mandatory Code Review & Tests (Workflow `/verify`).

## LLM10: Model Theft
*   **Risk**: Exfiltration of proprietary weights/prompts.
*   **Mitigation**: Centralized access control (ABS Gateway).
