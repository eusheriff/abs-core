# ABS MCP Server - VPS Deployment Guide

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  IDE / Agent    │────▶│   Oracle VPS    │────▶│   Cloudflare    │
│  (Cursor, etc)  │ MCP │   MCP Server    │ HTTP│   Workers + D1  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                         1GB + 4GB Swap          Edge Global
```

## Requirements

- **VPS**: Oracle Cloud Free Tier (1GB RAM, 4GB Swap)
- **OS**: Ubuntu 22.04+
- **Ports**: 22 (SSH), 3000 (optional HTTP)

## Quick Deploy

```bash
# On your VPS
curl -fsSL https://raw.githubusercontent.com/eusheriff/abs-core/main/scripts/deploy-vps.sh | bash
```

## Manual Deploy

### 1. Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential
```

### 2. Clone Repository

```bash
sudo mkdir -p /opt/abs
sudo chown $USER:$USER /opt/abs
git clone https://github.com/eusheriff/abs-core.git /opt/abs
```

### 3. Install Dependencies

```bash
cd /opt/abs
NODE_OPTIONS="--max-old-space-size=512" npm install --production
```

### 4. Configure Environment

```bash
cat > /opt/abs/packages/core/.env << EOF
ABS_MODE=scanner
ABS_CLOUDFLARE_API=https://abs.oconnector.tech
LLM_PROVIDER=mock
EOF
```

### 5. Run MCP Server

```bash
cd /opt/abs/packages/core
node --max-old-space-size=256 ../node_modules/.bin/tsx src/mcp/server.ts
```

## Memory Optimization (1GB VPS)

The server is configured to use minimal memory:

| Component | Memory |
|-----------|--------|
| Node.js heap | 256MB |
| SQLite | ~10MB |
| App code | ~20MB |
| **Total** | ~300MB |

This leaves ~700MB for OS and swap buffer.

## Connecting from IDE

### Cursor / VSCode

Add this to your MCP config (usually `~/.cursor/mcp.json` or via Settings):

```json
{
  "mcpServers": {
    "abs-oracle": {
      "command": "ssh",
      "args": [
        "-i",
        "/Users/YOUR_USER/.ssh/abs_mcp_key",
        "ubuntu@163.176.247.143",
        "cd /opt/abs/packages/core && export NODE_OPTIONS='--max-old-space-size=512' && /usr/bin/node /opt/abs/node_modules/.bin/tsx src/mcp/server.ts"
      ]
    }
  }
}
```

> **Note:** Replace `/Users/YOUR_USER` with your local path.

### Verified Connection Command

If you want to test manually from your terminal:

```bash
ssh -i ~/.ssh/abs_mcp_key ubuntu@163.176.247.143 "cd /opt/abs/packages/core && export NODE_OPTIONS='--max-old-space-size=512' && /usr/bin/node /opt/abs/node_modules/.bin/tsx src/mcp/server.ts"
```

### HTTP Mode (Alternative)

If you prefer HTTP over stdio, you can expose the MCP as HTTP endpoints:

```bash
# Future: npm run mcp:http
```

## Troubleshooting

### OOM Errors

```bash
# Check memory
free -h

# Add more swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Service Not Starting

```bash
sudo journalctl -u abs-mcp -n 50
```

### Update Deployment

```bash
cd /opt/abs
git pull
npm install --production
sudo systemctl restart abs-mcp
```
