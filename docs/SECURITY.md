# Security Architecture

## 1. Threat Model & Mitigations
ABS Core is designed to mitigate the **OWASP Top 10 for LLM Applications**.

### LLM01: Prompt Injection
**Risk**: Malicious user input manipulating the LLM instruction.
**Defense**: Strict separation of `system` vs `user` messages and input sanitization.
**Code**: See [`Sanitizer.sanitize()`](packages/core/src/core/sanitizer.ts).

### LLM02: Insecure Output Handling
**Risk**: LLM generating XSS or SQL injection payloads.
**Defense**: We strictly type LLM outputs to JSON schemas and do not execute code directly.
**Code**: See [`EventProcessor.process()`](packages/core/src/core/processor.ts) (Uses JSON mode).

### LLM08: Excessive Agency
**Risk**: LLM taking actions autonomously without oversight.
**Defense**: The **Policy Gate** is a hard constraint. No action is executed without an `ALLOW` decision log.
**Code**: See `PolicyEngine` in [`packages/core/src/core/dynamic-policy.ts`](packages/core/src/core/dynamic-policy.ts).

## 2. Infrastructure Security
- **Cloudflare**: DDoS protection and WAF (Rate Limiting) enabled by default.
- **D1 Database**: At-rest encryption (Cloudflare managed).
- **Secrets**: API Keys managed via `wrangler secret` (encrypted environment variables).

## 3. Auditability
- **Immutable Logs**: Every decision is logged *before* execution.
- **Traceability**: `trace_id` propagates from Event -> LLM -> Log -> Action.
