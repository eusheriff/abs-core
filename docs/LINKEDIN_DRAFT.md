# LinkedIn / Social Media Draft

**Headline:** Stop Letting Your LLMs Execute Code Directly.

We just released **v0.5-audited** of ABS Core (@abs/core), a specialized runtime for governing Autonomous Business Systems.

🚀 **The Problem:** Most AI agents are just probabilistic chatbots with `exec()` permissions. That’s a security nightmare (OWASP LLM01, LLM08).

🛡️ **The Solution:** ABS Core is a **deterministic policy gate**.
It sits between your Model and your DB.
1. LLM *proposes* an action.
2. ABS Policy *validates* it.
3. ABS *logs* the intent immutably.
4. Only THEN does execution happen.

We also launched **ABS Scan (@abs/scan)**—a free CLI tool to statically analyze your repo for "Direct LLM-to-Action" patterns.

**Open Source (Apache 2.0).**
Check the review: [link]
GitHub: [link]

#DecisionIntegrity #AIArchitecture #Governance #TypeScript #LLMSecurity
