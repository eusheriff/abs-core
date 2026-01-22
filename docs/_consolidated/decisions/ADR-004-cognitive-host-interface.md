# ADR-004: Cognitive Host Interface (CHI)

**Status:** Accepted  
**Date:** 2026-01-22  
**Authors:** Engº Rodrigo Gomes

---

## Context

### Current State
- IDEs and agent runtimes (Cursor, Claude Code, Antigravity) control:
  - Agent loop (plan → act → observe)
  - Workflows
  - Skills
  - Memory

- ABS currently controls:
  - Policy decisions (ALLOW/DENY)
  - Side effects (file system, network)
  - Risk assessment
  - Audit logging (WAL)

### Gap Identified
There is no layer that **governs the cognition itself** — only the effects.

This creates a strategic risk: if ABS tries to **execute** cognition (agent loops, workflows, skills), it:
- Loses its differentiator (governance)
- Becomes a competitor to IDEs
- Dilutes valuation
- Explodes scope

---

## Decision

Introduce the **Cognitive Host Interface (CHI)** as a formal layer of ABS.

> **CHI defines how agents CAN exist and operate, without EVER executing cognition or tools.**

### Core Principle

```
ABS does NOT execute agents.
ABS governs how agents CAN exist.
```

---

## 1. Cognition Profile

The nucleus of CHI. A declarative YAML schema that describes cognitive constraints.

### Schema

```yaml
cognition_profile:
  # Loop behavior
  loop_type: plan-act-observe | react | reflexion
  max_iterations: 5
  autonomy_level: low | medium | high
  
  # Memory scope
  memory_scope: session | project | workspace
  
  # Risk threshold
  risk_threshold: low | medium | high
  
  # Approval gates
  requires_approval_on:
    - fs.write:_consolidated/*
    - fs.delete:**/*
    - net.call:external
    - tool.execute:dangerous
  
  # Forbidden actions
  forbid:
    - fs.write:*.pem
    - fs.write:*.key
    - net.call:*
```

### Rules

| ✅ MUST | ❌ MUST NOT |
|---------|-------------|
| Declarative only | Executable steps |
| Constraints and limits | Tool calls |
| Risk thresholds | Conditional logic |
| Approval gates | Imperative commands |

---

## 2. Workflow Introspection (Not Execution)

### Principle

> **ABS does NOT execute workflows. ABS ANALYZES workflows.**

### Process

```
.agent/workflows/*.md
        ↓
    CHI Parser
        ↓
    Extract:
      - Intents
      - Potential side effects
      - Scopes touched
      - Risk indicators
        ↓
    Cross with:
      - Cognition Profile
      - Active Policies
        ↓
    Return Decision Envelope
```

### Example Output

```json
{
  "verdict": "ALLOW_WITH_CONSTRAINTS",
  "reason_code": "WORKFLOW_REQUIRES_APPROVAL",
  "message": "Workflow attempts to write to _consolidated/",
  "constraints": {
    "requires_approval_for": ["fs.write:_consolidated/*"]
  }
}
```

---

## 3. LLM Policy (Declaration, Not Routing)

### Principle

> **ABS never calls models directly. ABS only governs which models and capabilities CAN be used.**

### Schema

```yaml
llm_policy:
  # Allowed models
  allowed_models:
    - gpt-4.1
    - claude-3.5-sonnet
    - gemini-2.0-flash
  
  # Forbidden capabilities
  forbid_capabilities:
    - web_browse
    - tool_auto_execute
    - code_interpreter
  
  # Token limits
  max_tokens: 4096
  max_context: 128000
  
  # Rate limits
  max_calls_per_minute: 30
```

### What ABS Does NOT Do

- ❌ Call OpenAI API
- ❌ Call Anthropic API
- ❌ Route requests to models
- ❌ Manage API keys for LLMs

### What ABS DOES Do

- ✅ Declare which models are allowed
- ✅ Declare capability restrictions
- ✅ Enforce token/rate limits
- ✅ Return DENY if model is forbidden

---

## 4. Integration with Decision Envelope

CHI enriches the decision context but does NOT decide alone.

### Flow

```
┌─────────────────────┐
│  Cognition Profile  │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  Workflow / Intent  │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│    CHI Analysis     │
│  (introspection)    │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  Decision Envelope  │  ← standard ABS output
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│   PEP Enforcement   │
└─────────────────────┘
```

---

## 5. Invariants (System Laws)

These are non-negotiable rules that protect the project from scope creep:

| ID | Invariant |
|----|-----------|
| **CHI-I1** | CHI NEVER executes code |
| **CHI-I2** | CHI NEVER calls LLM APIs |
| **CHI-I3** | CHI NEVER invokes tools |
| **CHI-I4** | CHI ONLY produces analysis and constraints |
| **CHI-I5** | All CHI decisions flow through PDP |
| **CHI-I6** | CHI is stateless (no memory of past decisions) |

### Enforcement

Any PR that violates these invariants MUST be rejected citing this ADR.

---

## 6. Consequences

### Positive

| Benefit | Impact |
|---------|--------|
| ABS becomes universal control plane | Works with any IDE/agent |
| Clear governance boundary | No execution responsibility |
| Maintains focus | No competition with Cursor/etc |
| Scales without bloat | Minimal code, maximum value |
| Aligns with regulation | Governance > execution |
| Preserves valuation | Differentiator intact |

### Negative

| Trade-off | Mitigation |
|-----------|------------|
| ABS depends on external runtimes | By design — not a bug |
| Not "plug and play" complete | Provide clear integration docs |
| Requires host cooperation | Standard MCP protocol |

---

## 7. Implementation Roadmap

### Phase 1: Schema Definition
- [ ] Define `cognition_profile` YAML schema
- [ ] Define `llm_policy` YAML schema
- [ ] Create TypeScript types

### Phase 2: Introspection Engine
- [ ] Workflow parser (markdown → intents)
- [ ] Side effect extractor
- [ ] Risk scorer

### Phase 3: Integration
- [ ] Connect CHI to PDP
- [ ] Enrich Decision Envelope with CHI context
- [ ] Add CHI fields to Governance Header

---

## 8. Anti-Patterns (What NOT to Build)

To prevent future scope creep, explicitly list forbidden additions:

| ❌ DO NOT BUILD | Why |
|-----------------|-----|
| Agent Loop Engine | ABS is governance, not execution |
| Skills Registry (executable) | Skills belong to IDE/host |
| Workflow Engine | Workflows belong to IDE/host |
| LLM Router | Routing belongs to IDE/host |
| Memory Store | Memory belongs to IDE/host |
| Tool Executor | Tools belong to IDE/host |

If any of these are ever proposed, cite this ADR as blocking.

---

## Summary

> **ABS does not execute agents. ABS governs how agents can exist.**

This ADR establishes the **Cognitive Host Interface (CHI)** as the formal boundary between:
- **Cognition** (owned by IDE/agent runtime)
- **Governance** (owned by ABS)

CHI allows ABS to understand and constrain cognitive behavior **without ever executing it**.

This preserves:
- Strategic focus
- Competitive moat
- Valuation potential
- Regulatory alignment

---

**Decision:** ACCEPTED  
**Effective:** Immediately
