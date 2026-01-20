#!/bin/bash
# deploy-vps.sh - Deploy ABS MCP Server to Oracle VPS
# Requirements: Ubuntu 22.04+, 1GB RAM + swap

set -e

echo "🚀 ABS MCP Server - VPS Deploy Script"
echo "======================================"

# 1. Update system
echo "[1/7] Updating system..."
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 20
echo "[2/7] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install build tools (for native modules like better-sqlite3)
echo "[3/7] Installing build tools..."
sudo apt install -y build-essential python3

# 4. Create app directory
echo "[4/7] Setting up app directory..."
sudo mkdir -p /opt/abs
sudo chown $USER:$USER /opt/abs

# 5. Clone or copy code
echo "[5/7] Cloning repository..."
cd /opt/abs
if [ -d ".git" ]; then
    git pull origin main
else
    git clone https://github.com/eusheriff/abs-core.git .
fi

# 6. Install dependencies (with reduced memory)
echo "[6/7] Installing dependencies..."
cd /opt/abs
export NODE_OPTIONS="--max-old-space-size=512"
npm install --production

# 7. Create systemd service
echo "[7/7] Creating systemd service..."
sudo tee /etc/systemd/system/abs-mcp.service > /dev/null << 'EOF'
[Unit]
Description=ABS MCP Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/abs/packages/core
Environment=NODE_ENV=production
Environment=ABS_MODE=scanner
Environment=ABS_CLOUDFLARE_API=https://abs.oconnector.tech
ExecStart=/usr/bin/node --max-old-space-size=256 /opt/abs/node_modules/.bin/tsx src/mcp/server.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable abs-mcp
sudo systemctl start abs-mcp

echo ""
echo "✅ Deploy complete!"
echo ""
echo "Commands:"
echo "  sudo systemctl status abs-mcp   # Check status"
echo "  sudo journalctl -u abs-mcp -f   # View logs"
echo "  sudo systemctl restart abs-mcp  # Restart"
