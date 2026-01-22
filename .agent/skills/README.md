# ABS Skills Directory

This directory contains curated skills for AI coding agents operating under ABS governance.

## Structure

```
.agent/skills/
├── abs-governance/     # ABS core governance skill
├── security/           # Security testing and vulnerability detection
├── agents/             # Agent patterns, memory, evaluation
├── development/        # Code quality, architecture, best practices
└── operations/         # DevOps, deployment, workflows
```

## Skill Categories

### 🛡️ Security (9 skills)
- `cc-skill-security-review` - Security code review
- `pentest-checklist` - Penetration testing checklist
- `pentest-commands` - Common pentest commands
- `sql-injection-testing` - SQL injection detection
- `xss-html-injection` - XSS/HTML injection testing
- `broken-authentication` - Auth vulnerability testing
- `file-path-traversal` - Path traversal detection
- `idor-testing` - IDOR vulnerability testing
- `top-web-vulnerabilities` - OWASP top vulnerabilities

### 🤖 Agents (7 skills)
- `agent-evaluation` - Evaluate agent behavior
- `agent-memory-systems` - Memory architecture patterns
- `agent-memory-mcp` - MCP-based memory
- `autonomous-agent-patterns` - Autonomy patterns
- `autonomous-agents` - Building autonomous agents
- `ai-agents-architect` - Agent architecture design
- `agent-tool-builder` - Building agent tools

### 💻 Development (7 skills)
- `clean-code` - Clean code principles
- `code-review-checklist` - Code review guidelines
- `cc-skill-coding-standards` - Coding standards
- `architecture` - Software architecture
- `api-patterns` - API design patterns
- `backend-dev-guidelines` - Backend best practices
- `frontend-dev-guidelines` - Frontend best practices

### ⚙️ Operations (5 skills)
- `docker-expert` - Docker best practices
- `git-pushing` - Git workflows
- `github-workflow-automation` - GitHub Actions
- `deployment-procedures` - Deployment guidelines
- `context-window-management` - LLM context optimization

## Usage

Skills are automatically available to the AI agent. Reference them by name:

```
Use the pentest-checklist skill to review this authentication flow.
```

## Source

Community skills from [antigravity-awesome-skills](https://github.com/sickn33/antigravity-awesome-skills)
with ABS-specific governance extensions.

## Integration with ABS

All skill operations are governed by ABS policies:
- Security findings → trigger policy evaluation
- Agent decisions → logged to WAL
- Code changes → validated against coding standards
