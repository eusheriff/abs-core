# ABS Core On-Premise Guide (Docker) 🐳

**Status**: Active Support via MCP Server Adapter.

## Overview
While the hosted version of ABS Core runs on Cloudflare Workers (Edge), the Enterprise Runtime is fully compatible with any Docker-capable environment (AWS ECS, Kubernetes, Bare Metal) via the Node.js MCP Server adapter.

## Architecture Adaptation

| Component | Cloudflare (Edge) | On-Premise (Docker) |
|-----------|-------------------|---------------------|
| **Runtime**| V8 Isolate (Workers)| Node.js 20+ |
| **Database**| D1 (Distributed SQLite)| SQLite (Volume `abs.sqlite`) |
| **Auth** | Worker KV | JSON File / Env Vars |
| **Protocol**| HTTP / WebSocket | Stdio / SSE |

## Quick Start

### 1. Prerequisities
- Docker & Docker Compose
- OpenAI/Gemini API Key

### 2. Run with Docker Compose
Create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  abs-core:
    image: oconnector/abs-core:v2.0.0
    container_name: abs-core
    restart: unless-stopped
    volumes:
      - ./data:/app/data
    environment:
      - ABS_MODE=runtime
      - ABS_LLM_PROVIDER=gemini
      - GEMINI_API_KEY=your_key_here
      - PORT=3000
    ports:
      - "3000:3000"
```

### 3. Verification
```bash
curl http://localhost:3000/health
# {"status":"ok","mode":"runtime","version":"2.0.0"}
```

## Production Considerations

### Persistence
Mount the `/app/data` volume to a persistent block storage (EBS/PVC) to ensure the `abs.sqlite` database (Decision Logs) survives container restarts.

### Networking
The On-Premise image exposes an MCP-compatible SSE (Server-Sent Events) endpoint at `/mcp`. Configure your Agent Framework (LangChain/Flowise) to connect to `http://host:3000/mcp`.

### Security
In self-hosted mode, you manage the API Keys. Ensure `GEMINI_API_KEY` is injected securely (Secrets Manager/Vault).
