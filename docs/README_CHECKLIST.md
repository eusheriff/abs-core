# README Reinforcement Checklist

Based on the v0.5 Technical Review, ensure the README includes:

- [ ] **Positioning Statement**: Explicitly state "This is a Governance Runtime, not a Chatbot Framework".
- [ ] **Architecture Diagram/Link**: Reference `ARCHITECTURE.md` specifically regarding the "Proposal -> Policy -> Log -> Execute" loop.
- [ ] **Scanner Entry Point**: Add a section "Is my code safe?" pointing to `npx @abs/cli scan`.
- [ ] **Security Badge**: Mention "Audited against OWASP LLM Top 10 (LLM01, LLM08)".
- [ ] **Monorepo Structure**: Briefly explain `@abs/core` vs `@abs/scan`.
