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

## 6. CHI Analysis Output (Auditable Artifact)

CHI MUST produce structured, auditable analysis output.

### Schema

```yaml
chi_analysis:
  # Detected intents from workflow/action
  detected_intents:
    - fs.write:_consolidated/STATE.md
    - tool.execute:abs_wal_append
  
  # Inferred risks
  inferred_risks:
    - irreversible_state_mutation
    - audit_log_modification
  
  # Suggested constraints
  suggested_constraints:
    - require_wal_event
    - require_approval
    - max_scope:project
  
  # Confidence level
  confidence: high | medium | low
  
  # Reasoning trace (for auditing)
  reasoning:
    - "Detected fs.write to _consolidated/ → irreversible state change"
    - "Cross-referenced with cognition_profile.requires_approval_on"
    - "Suggested constraint: require_approval"
```

### Purpose

This structured output:
- Enables **auditing** of CHI decisions
- Facilitates **testing** of introspection logic
- Provides **explainability** for humans

---

## 7. Risk Forecast Integration

### Principle

> **CHI MAY request risk assessment, but MUST NOT produce final verdicts.**

### Integration with Risk Analysis

CHI can signal that prospective (forward-looking) risk analysis is needed:

```yaml
chi_analysis:
  request_risk_forecast: true
  risk_forecast_context:
    action: fs.write
    target: _consolidated/STATE.md
    scope: project
```

The Risk Forecast layer (separate from CHI) then:
- Analyzes historical patterns
- Predicts potential outcomes
- Enriches the Decision Envelope

### Separation of Concerns

| Layer | Responsibility |
|-------|---------------|
| CHI | Introspection, constraint suggestion |
| Risk Forecast | Predictive analysis |
| PDP | Final verdict |
| PEP | Enforcement |

---

## 8. Conformance Requirements

Any implementation of CHI (internal or third-party) MUST prove:

### Mandatory Proofs

| ID | Requirement | Verification |
|----|-------------|--------------|
| CHI-C1 | No code execution | Static analysis + runtime checks |
| CHI-C2 | No external calls | Network monitoring |
| CHI-C3 | Structured output only | Schema validation |
| CHI-C4 | Stateless operation | No persistent state |
| CHI-C5 | Deterministic analysis | Same input → same output |

### Conformance Suite (Future)

A conformance test suite will verify:
- Input: known workflow/profile
- Expected output: deterministic chi_analysis
- Invariant checks: no side effects

This prepares ABS for:
- **Enterprise certification**
- **Regulatory compliance**
- **Third-party integrations**

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
