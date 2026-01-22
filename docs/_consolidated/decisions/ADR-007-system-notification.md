# ADR-007: Authorized Agent Response Headers (ABS System)

**Status:** Proposed  
**Date:** 2026-01-22  
**Authors:** Engº Rodrigo Gomes

## Context
Users do not know when ABS has intervened. The governance layer acts silently, which builds distrust ("Is it working?").
The user requested a clear "ABS System" indicator.

## Decision
Every interaction processed by ABS Kernel MUST return a structured **Governance Header** (visible to the Agent/User) and detailed metadata.

### 1. The "ABS System" Block
When ABS intercepts an action, it will inject a standard header into the output stream:

```markdown
> [!IMPORTANT]
> **🛡️ ABS System** governed this action.
> **Verdict**: `ALLOW` (Confidence: 98%)
> **Policy**: `chi-integrity-v1`
> **Audit**: `WAL-8f7a9c...`
```

### 2. Implementation Strategy

#### A. CLI / Terminal
Append to `stdout`:
```
[ABS System] 🛡️ ALLOW: fs.write (src/utils.ts)
```

#### B. Agent Context (MCP)
Inject into the tool result:
```json
{
  "content": [
    {
      "type": "text",
      "text": "File written successfully."
    }
  ],
  "governance": {
    "source": "ABS Kernel",
    "verdict": "ALLOW",
    "risk_score": 5,
    "chi_analysis": { ... }
  }
}
```

#### C. VS Code UI
The Extension will parse this metadata and show a "Toast" or Status Bar update:
- 🟢 **ABS: Allowed** (Safe)
- 🔴 **ABS: Blocked** (Policy Violation)
- 🟡 **ABS: Review** (Human in the loop)

## Consequences
- **Visibility**: Users trust the system because they see it working.
- **Traceability**: WAL ID is immediately available.
- **Overhead**: Minimal text injection.

---
**Decision**: PROPOSED
