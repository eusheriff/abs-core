# ABS Kernel - Authorized Agent Governance 🛡️

[![Visual Studio Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue?logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=oconnector.abs-vscode)
[![Open VSX](https://img.shields.io/badge/Open%20VSX-Registry-purple?logo=eclipse)](https://open-vsx.org/extension/oconnector/abs-vscode)
[![License](https://img.shields.io/badge/License-Apache%202.0-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-orange)](https://github.com/eusheriff/abs-core)

> **Governance Layer for AI Coding Agents.**

Install the official **ABS Kernel** extension to supervise your AI Coding Agents (Cursor, Copilot, Windsurf, Cline) with the **Cognitive Host Interface (CHI)**.

---

## 🚀 New: ABS Kernel & CHI

This extension implements **ADR-004 (Cognitive Host Interface)** and **ADR-005 (Layer Separation)**:

- **Governance, Not Execution**: ABS governs *how* agents exist, without running them.
- **WAL (Write-Ahead Log)**: Immutable audit trail for all agent actions.
- **Layer Separation**: Kernel (Trusted) > Profile > Workspace > Input (Untrusted).

---

## 🖥️ Compatible IDEs

| IDE | Status | Installation |
|-----|--------|--------------|
| **VS Code** | ✅ Native | [Marketplace](https://marketplace.visualstudio.com/items?itemName=oconnector.abs-vscode) |
| **Cursor** | ✅ Compatible | Manual VSIX install (see below) |
| **Windsurf** | ✅ Compatible | Manual VSIX install |
| **VSCodium** | ✅ Compatible | [Open VSX](https://open-vsx.org/extension/oconnector/abs-vscode) |
| **GitHub Codespaces** | ✅ Compatible | Install from Marketplace |
| **Gitpod** | ✅ Compatible | Add to `.gitpod.yml` |
| **JetBrains** | 🔜 Coming Soon | IntelliJ Plugin (Roadmap) |

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🔍 **Scan & Audit** | Check code for policy violations and maintain a Write-Ahead Log (WAL). |
| 🛡️ **Coding Agent Safeguards** | Block dangerous patterns like `rm -rf`, `git reset --hard`, secret exposure. |
| 📊 **Real-time Feedback** | View scan results instantly in the Output panel. |
| 🔗 **ABS Kernel Integration** | Connect to local or cloud ABS Kernel for centralized governance. |
| 🎛️ **Sidebar Panel** | Visual interface to select files and trigger scans. |

---

## 🚀 Quick Start

### VS Code / Codespaces
1. Install from [Marketplace](https://marketplace.visualstudio.com/items?itemName=oconnector.abs-vscode)
2. Open the **ABS Kernel** sidebar (shield icon)
3. Select files and click **"Scan Selected Files"**

### Cursor / Windsurf / VSCodium

1. Download the latest `.vsix` from [Releases](https://github.com/eusheriff/abs-core/releases)
2. Open Command Palette: `Cmd+Shift+P` (Mac) / `Ctrl+Shift+P` (Win/Linux)
3. Run: `Extensions: Install from VSIX...`
4. Select the downloaded `abs-vscode-X.X.X.vsix` file
5. Reload the IDE

**Or via CLI:**
```bash
# Cursor
cursor --install-extension abs-vscode-0.1.0.vsix

# VS Code
code --install-extension abs-vscode-0.1.0.vsix
```

---

## 🎯 Use Cases

- **Supervise AI Agents**: Monitor what Cursor, Copilot, Cline, and other agents are doing in your codebase.
- **Block Destructive Commands**: Prevent `rm -rf`, `git push --force`, and credential leaks.
- **Enforce Team Policies**: Define rules like "No hardcoded secrets" or "No direct DB writes".
- **Audit Trail (WAL)**: Every significant action is hashed and logged to `WORKLOG.wal`.

---

## ⚙️ Configuration

The extension connects to the ABS Kernel API by default:

```
API Endpoint: https://api.abscore.app
```

For self-hosted deployments, you can configure via settings:

```json
{
  "abs.apiUrl": "https://your-abs-instance.com"
}
```

---

## 🔒 Built-in Safeguards

| Rule ID | Description | Action |
|---------|-------------|--------|
| `code-01` | Block recursive delete (`rm -rf`) outside temp dirs | DENY |
| `code-02` | Protect secrets (`.env`, `.pem`, SSH keys) | ESCALATE |
| `code-03` | Block force push (`git push --force`) | DENY |
| `code-04` | Block hard reset (`git reset --hard`) | ESCALATE |
| `code-05` | Detect prompt injection patterns | WARN |

---

## 📦 Installation Options

### Option 1: VS Code Marketplace (Recommended)
```bash
code --install-extension oconnector.abs-vscode
```

### Option 2: Open VSX (VSCodium, Gitpod)
```bash
# Via ovsx CLI
ovsx get oconnector.abs-vscode
```

### Option 3: Direct VSIX Download
Download from [GitHub Releases](https://github.com/eusheriff/abs-core/releases) and install manually.

---

## 🌐 Links

- **Landing Page**: [abscore.app](https://abscore.app)
- **API Docs**: [api.abscore.app](https://api.abscore.app)
- **GitHub**: [eusheriff/abs-core](https://github.com/eusheriff/abs-core)
- **Enterprise**: [OConnector Technology](https://oconnector.tech)

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

---

## 📄 License

Apache-2.0 © [OConnector Technology](https://oconnector.tech)
