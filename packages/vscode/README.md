# ABS Core for VS Code 🛡️

[![Visual Studio Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue?logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=oconnector.abs-vscode)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.0.1-orange)](https://github.com/eusheriff/abs-core)

> **Stop AI Coding Agents from Destroying Your Codebase.**

This extension integrates the **ABS Core Scanner** directly into VS Code, protecting you from destructive commands, policy violations, and security risks—whether caused by you or your AI assistant.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🔍 **Scan Current File** | Check your active file for policy violations with one command. |
| 🛡️ **Coding Agent Safeguards** | Block dangerous patterns like `rm -rf`, `git reset --hard`, and editing `.env` files. |
| 📊 **Real-time Feedback** | View scan results instantly in the VS Code Output panel. |
| 🔗 **Runtime Integration** | Connect to your ABS Runtime for centralized policy enforcement (Enterprise). |

---

## 🚀 Quick Start

1. **Open Command Palette**: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac).
2. **Run**: `ABS: Scan Current File`.
3. **Review**: Check the "ABS Core" output channel for results.

---

## 🎯 Use Cases

- **Protect from AI Assistants**: Cursor, Copilot, and other AI agents sometimes propose destructive commands. ABS blocks them before execution.
- **Enforce Team Policies**: Define rules like "No hardcoded secrets" or "No direct DB writes" and scan on save.
- **Audit Trail**: Every scan is logged, providing a forensic trail of what was checked and when.

---

## ⚙️ Requirements

- **Node.js** v18+ (for local scanning).
- **Optional**: ABS Runtime Token for Enterprise features (`ABS_TOKEN`).

---

## 📦 Installation

### From Marketplace (Recommended)
Search for "ABS Core" in VS Code Extensions or [click here](https://marketplace.visualstudio.com/items?itemName=oconnector.abs-vscode).

### From Source
```bash
git clone https://github.com/eusheriff/abs-core.git
cd abs-core/packages/vscode
npm install
code --extensionDevelopmentPath=.
```

---

## 🔒 Policies Included

The extension ships with built-in safeguards:

| Rule ID | Description | Action |
|---------|-------------|--------|
| `code-01` | Block recursive delete (`rm -rf`) outside temp dirs | DENY |
| `code-02` | Protect secrets (`.env`, `.pem`, SSH keys) | ESCALATE |
| `code-03` | Block force push (`git push --force`) | DENY |
| `code-04` | Block hard reset (`git reset --hard`) | ESCALATE |

---

## 🌐 Links

- **Website**: [abscore.app](https://abscore.app)
- **GitHub**: [eusheriff/abs-core](https://github.com/eusheriff/abs-core)
- **Enterprise**: [OConnector Technology](https://oconnector.tech/abs)

---

## 📄 License

MIT © [OConnector Technology](https://oconnector.tech)
