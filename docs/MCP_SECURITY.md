# MCP Security Model

> **Status**: Enforced (v2.8.0+)
> **Trust Model**: Zero Trust (Agent-to-Runtime)

## Overview

The ABS MCP Server acts as the **Governance Interface** between the AI Agent (IDE, Chatbot) and the Execution Runtime. To prevent "Shadow IT" usage of powerful coding tools, we enforce a strict **Role-Based Access Control (RBAC)** model tied to the specialized license.

## Authentication (AuthN)

Authentication is handled via the `ABS_TOKEN` environment variable.

1.  **Token Issuance**: Tokens are JWTs signed by the **Auth Worker** (`auth-worker`).
2.  **Verification**: On startup, the MCP Server validates the token against the Auth Worker API.
3.  **Identity**: The token encodes the `tenant_id`, `user_id`, and `plan` (Community vs Enterprise).

## Authorization (AuthZ) & Tool Visibility

Tools are dynamically registered based on the verified **Plan**.

| Tool | Description | Community (Free) | Enterprise (Paid) |
| :--- | :--- | :---: | :---: |
| `abs_evaluate` | Audit Log & Policy Check | ✅ | ✅ |
| `abs_log` | Fire-and-forget logging | ✅ | ✅ |
| `abs_check_policy` | Dry-run validation | ✅ | ✅ |
| `abs_get_decisions`| History retrieval | ✅ | ✅ |
| `abs_check_file_edit` | **Coding Agent Safeguard** | ❌ | ✅ |
| `abs_check_command` | **Terminal Command Safeguard** | ❌ | ✅ |

> **Rationale**: Active intervention in the coding loop (File/Command gating) is a high-value Enterprise feature. The Community edition is focused on *visibility* (Logging).

## Tool Signing (Future)

In v3.0, we will introduce **Tool Response Signing**:
- The MCP Server will sign every `allow` decision with the `ABS_SECRET_KEY`.
- The Agent (if compliant) will refuse to execute any tool call that doesn't carry a valid signature.

## Offline Mode

If the License Server is unreachable:
- The system defaults to **Community Mode** (Fail-Safe).
- Only Logging/Evaluation tools are available.
- "Code Safety" tools are hidden to prevent unauthorized usage bypass.
