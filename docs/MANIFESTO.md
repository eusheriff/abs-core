# ABS Core Manifesto

> **"Autonomy without governance is risk."**

## Vision

### The Problem
Modern AI systems can make decisions, but most lack governance, auditability, and controlled failure. When AI is embedded directly into workflows, prompts, or agents, organizations lose visibility, control, and accountability.

### The Solution
ABS Core defines a neutral runtime that governs autonomous business decisions through explicit state, policies, audit trails, and human escalation. Intelligence is pluggable; responsibility is mandatory.

### Core Design Principle
**ABS Core prioritizes reliability of decisions over intelligence of models.**

---

## Core Principles

1.  **Event-driven, not command-driven**
    All interactions begin with immutable events. No direct command execution without an event trigger.
2.  **Decision is separated from execution**
    Deciding "what to do" and "doing it" are distinct phases, enforced by architecture.
3.  **LLMs propose, never execute**
    Generative models are suggestion engines. They produce JSON proposals, not side effects.
4.  **Policies override intelligence**
    If a heuristic rule conflicts with an AI suggestion, the rule always wins. Code is law.
5.  **Every decision is auditable**
    Execution cannot happen without a persisted `DecisionLog`.
6.  **Failure is expected and controlled**
    Systems must degrade gracefully. Partial autonomy > Total failure.
7.  **Human-in-the-loop is a first-class citizen**
    Escalation to explicit human approval is a native state, not an exception.
8.  **Vendor lock-in is explicitly avoided**
    Agnostic to LLM provider, cloud vendor, or specific business domain.

---

## Non-Goals

*   Not a chatbot framework
*   Not an RPA tool
*   Not an agent orchestration framework
*   Not a workflow engine replacement
*   Not a proprietary SaaS

---

## Architecture Philosophy

### Separation of Concerns
*   **Channels**: Produce events only (UI, bots, APIs).
*   **Decision Providers**: Suggest actions only (LLMs, ML models, heuristics).
*   **Policies**: Validate decisions (rules, compliance, risk).
*   **Executors**: Perform side effects (messages, webhooks, systems).
*   **Humans**: Approve or override when required.

### Governance-First
*   **Governance-first, intelligence-second**.
*   **Explicit over implicit**.
*   **Boring architecture beats clever prompts**.

---

## Why This Project Exists

The industry knows how to make AI decide. It does not know how to make AI **accountable**. ABS Core exists to define that missing layer.

**ABS Core is not about making AI smarter. It is about making autonomy safe, explainable, and trustworthy. Intelligence is optional. Responsibility is not.**
