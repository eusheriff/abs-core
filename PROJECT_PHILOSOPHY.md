# Project Philosophy

> "The Code > The Model. Always."

This document outlines the core philosophy behind `abs-core`. It serves as a guide for contributors, maintainers, and users to understand **why** the system is built this way and **what it will never become**.

## 1. The Core Thesis
We believe that Large Language Models (LLMs) are **probabilistic engines**, while business operations require **deterministic guarantees**.

Therefore:
- We treat LLM output as **untrusted input**.
- We never execute an LLM proposal directly.
- We enforce a **Hard Policy Gate** between reasoning and execution.

## 2. Invariants are Non-Negotiable
Features that compromise the integrity of the [Governance Loop](README.md#architecture) will be rejected, regardless of user demand.

**We will reject PRs that:**
- Add "Bypass Policy" flags for convenience.
- Allow execution without an immutable log entry.
- Implement "Human feedback" as an afterthought step *after* execution.

## 3. Excessive Agency Mitigation
We follow [OWASP LLM08](https://owasp.org/www-project-top-10-for-large-language-model-applications/llm08-excessive-agency.html) strictly. The runtime is designed to limit agentic authority by default.
Autonomy is granted only to the extent that it can be proven safe by policy code.

## 4. Not a "Framework"
`abs-core` is a **Reference Runtime**, not a general-purpose framework.
- Our goal is to provide a standard for **Decision Integrity**.
- Our goal is NOT to support every LLM provider, vector database, or tool chaining library in existence.
- Stability > Features.

## 5. The "No Hype" Rule
We do not use terms like AGI, "Magic", or "Sentient".
We build infrastructure for **Governed Autonomy**. We value engineering rigor over marketing claims.

---
*If you are looking for a tool to "just let the AI do everything," this project is not for you.*
