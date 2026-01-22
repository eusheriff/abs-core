# ADR-005: Profiles, Workspaces & Personal Layer Separation

**Status:** Accepted  
**Date:** 2026-01-22  
**Authors:** Engº Rodrigo Gomes

---

## Context

### The Triangle

ABS operates at the intersection of three distinct layers:

1. **Kernel** — ABS core (governance engine)
2. **Cognition** — Declared by IDE/agent (CHI interface, ADR-004)
3. **Personal** — User's preferences, state, untrusted input

### Problem

Without clear separation:
- Personal data (user rules, context) could contaminate kernel decisions
- Untrusted input could bypass governance
- State confusion between projects/workspaces
- Audit trails become unreliable

### Prior Art

- ADR-003: Decision Envelope (standardized verdicts)
- ADR-004: Cognitive Host Interface (governance ≠ execution)

---

## Decision

Establish formal separation between:

| Layer | Owner | Trust Level | Mutability |
|-------|-------|-------------|------------|
| **Kernel** | ABS | Trusted | Immutable at runtime |
| **Profile** | User/Org | Semi-trusted | Declarative only |
| **Workspace** | Project | Untrusted | Scoped to project |
| **Input** | External | Untrusted | Per-request |

---

## 1. Kernel Layer (ABS Core)

### Definition

The ABS Kernel is the immutable governance engine.

### Properties

| Property | Value |
|----------|-------|
| Trust level | **Absolute** |
| Mutability | **None at runtime** |
| Source | ABS codebase only |
| Contains | Policies, PDP, PEP, WAL, invariants |

### Invariant

> **K-I1: Kernel state CANNOT be modified by Profile, Workspace, or Input.**

The Kernel reads configuration but never mutates based on external data.

---

## 2. Profile Layer (User/Organization)

### Definition

User or organization preferences that configure ABS behavior.

### Examples

```yaml
# ~/.abs/profile.yaml (or org-level)
abs_profile:
  version: "1.0"
  
  # Identity
  identity:
    user_id: "user-123"
    org_id: "org-456"
    role: developer | admin | auditor
  
  # Global preferences
  preferences:
    default_risk_threshold: medium
    require_approval_for_delete: true
    enable_prospective_risk: true
  
  # Allowed capabilities
  capabilities:
    can_disable_safe_mode: false
    can_bypass_approval: false
    max_autonomy_level: medium
```

### Properties

| Property | Value |
|----------|-------|
| Trust level | **Semi-trusted** |
| Mutability | **By user/admin only** |
| Scope | Global (across workspaces) |
| Validation | Schema-validated by Kernel |

### Invariant

> **P-I1: Profile CANNOT grant capabilities beyond Kernel limits.**
> **P-I2: Profile MUST be schema-validated before use.**

---

## 3. Workspace Layer (Project)

### Definition

Project-specific state and configuration. Inherently less trusted than Profile.

### Examples

```yaml
# <workspace>/.abs/workspace.yaml
abs_workspace:
  version: "1.0"
  
  # Project identity
  project:
    name: "my-project"
    type: backend | frontend | monorepo
  
  # Local overrides (cannot exceed Profile limits)
  overrides:
    risk_threshold: high  # Only if Profile allows
    allowed_paths:
      - src/
      - tests/
    forbidden_paths:
      - secrets/
      - .env*
  
  # Cognition profile for this workspace (CHI)
  cognition:
    max_iterations: 3
    autonomy_level: low
```

### Properties

| Property | Value |
|----------|-------|
| Trust level | **Untrusted** |
| Mutability | **Per-project** |
| Scope | Single workspace |
| Validation | Schema + Profile bounds check |

### Invariant

> **W-I1: Workspace config CANNOT exceed Profile limits.**
> **W-I2: Workspace paths MUST be within workspace root.**

---

## 4. Input Layer (External/Runtime)

### Definition

Per-request data from IDE, agent, or user. Maximum distrust.

### Examples

- User prompts
- Agent tool calls
- Workflow parameters
- File contents to analyze

### Properties

| Property | Value |
|----------|-------|
| Trust level | **Zero trust** |
| Mutability | **Per-request** |
| Scope | Single operation |
| Validation | Sanitize + validate + quota |

### Invariant

> **I-I1: Input NEVER directly modifies Kernel, Profile, or Workspace state.**
> **I-I2: Input MUST be sanitized before any processing.**
> **I-I3: Input is EPHEMERAL — not persisted beyond request.**

---

## 5. Trust Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│                      KERNEL                             │
│              (absolute trust, immutable)                │
│                                                         │
│    ┌─────────────────────────────────────────────┐     │
│    │               PROFILE                        │     │
│    │        (semi-trusted, user/org)              │     │
│    │                                              │     │
│    │    ┌─────────────────────────────────┐      │     │
│    │    │          WORKSPACE               │      │     │
│    │    │     (untrusted, project)         │      │     │
│    │    │                                  │      │     │
│    │    │    ┌───────────────────────┐    │      │     │
│    │    │    │        INPUT          │    │      │     │
│    │    │    │   (zero trust)        │    │      │     │
│    │    │    └───────────────────────┘    │      │     │
│    │    └─────────────────────────────────┘      │     │
│    └─────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### Rule

> Each layer can only **restrict**, never **expand** the layer above it.

---

## 6. Context Pack Integration

The `_consolidated/` directory (Context Pack) belongs to the **Workspace Layer**.

### Implications

| Artifact | Layer | Trust |
|----------|-------|-------|
| `STATE.md` | Workspace | Untrusted (user-editable) |
| `WORKLOG.md` | Workspace | Untrusted (user-editable) |
| `WORKLOG.wal` | Kernel | Trusted (hash-chained) |
| `decisions/*.md` | Workspace | Semi-trusted (reviewed ADRs) |

### Invariant

> **CP-I1: WAL is Kernel-owned. STATE/WORKLOG are Workspace-owned.**
> **CP-I2: Kernel NEVER trusts STATE.md for security decisions.**

---

## 7. Prompt Injection Defense

With layer separation, prompt injection defense becomes architectural:

### Attack Surface

| Layer | Injection Risk | Mitigation |
|-------|---------------|------------|
| Kernel | None (no external input) | N/A |
| Profile | Low (admin-controlled) | Schema validation |
| Workspace | Medium | Bounds checking, schema |
| Input | **High** | Sanitize, isolate, quota |

### Principle

> Input layer is ALWAYS treated as adversarial.
> No input ever flows "upward" to higher trust layers without explicit validation.

---

## 8. Implementation

### File Structure

```
~/.abs/
├── profile.yaml           # Profile layer (user-global)
└── orgs/
    └── my-org/
        └── profile.yaml   # Profile layer (org-global)

<workspace>/
├── .abs/
│   └── workspace.yaml     # Workspace layer
└── _consolidated/
    ├── STATE.md           # Workspace state (untrusted)
    ├── WORKLOG.md         # Workspace log (untrusted)
    ├── WORKLOG.wal        # Kernel audit log (trusted)
    └── decisions/         # ADRs (semi-trusted)
```

### Resolution Order

When evaluating a policy:

```
1. Kernel defaults (immutable base)
       ↓
2. Profile overrides (if allowed by Kernel)
       ↓
3. Workspace overrides (if allowed by Profile)
       ↓
4. Request context (never overrides, only provides data)
```

---

## 9. Invariants Summary

| ID | Invariant |
|----|-----------|
| **K-I1** | Kernel state CANNOT be modified by external layers |
| **P-I1** | Profile CANNOT grant capabilities beyond Kernel limits |
| **P-I2** | Profile MUST be schema-validated |
| **W-I1** | Workspace CANNOT exceed Profile limits |
| **W-I2** | Workspace paths MUST be within workspace root |
| **I-I1** | Input NEVER modifies state |
| **I-I2** | Input MUST be sanitized |
| **I-I3** | Input is ephemeral |
| **CP-I1** | WAL is Kernel-owned |
| **CP-I2** | Kernel NEVER trusts STATE.md for security |

---

## 10. Consequences

### Positive

| Benefit | Impact |
|---------|--------|
| Clear security boundaries | Defense in depth |
| Predictable behavior | Same input → same output |
| Audit clarity | Know which layer decided what |
| Prompt injection defense | Architectural, not ad-hoc |
| Multi-tenant ready | Profile/Workspace isolation |

### Negative

| Trade-off | Mitigation |
|-----------|------------|
| More complexity | Clear documentation |
| Config in multiple places | Resolution order is deterministic |
| Learning curve | Good defaults |

---

## Summary

This ADR completes the "ABS Triangle":

```
         ┌─────────────┐
         │   Kernel    │  ← ADR-001, ADR-002, ADR-003
         │ (Governance)│
         └──────┬──────┘
                │
    ┌───────────┴───────────┐
    │                       │
┌───┴───┐             ┌─────┴─────┐
│  CHI  │             │  Layers   │
│(ADR-004)            │ (ADR-005) │
└───────┘             └───────────┘
```

With these three pillars:
1. **Governance** (Kernel, policies, decisions)
2. **Cognition Interface** (CHI, declared constraints)
3. **Layer Separation** (trust hierarchy)

**ABS is now conceptually complete.**

---

**Decision:** ACCEPTED  
**Effective:** Immediately
