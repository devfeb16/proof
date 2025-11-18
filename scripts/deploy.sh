#!/bin/bash

# ===========================================
# 🚀 Automated Deployment Script for Proof Server
# Works with GitHub Actions + DigitalOcean Droplet
# ===========================================

set -euo pipefail
IFS=$'\n\t'

echo ""
echo "🚀 Starting deployment on $(hostname) at $(date)"
echo "-------------------------------------------"

# Move to project root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR%/scripts}"
cd "$PROJECT_DIR"

echo "📂 Current directory: $(pwd)"

# -----------------------------
# 🧠 Check Git repository context
# -----------------------------
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "📥 Fetching latest changes from origin/main..."
  git fetch origin main
  git reset --hard origin/main
else
  echo "⚠️  Not inside a git repository. Skipping git sync."
fi

# -----------------------------
# 🧰 Node + NVM setup
# -----------------------------
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  echo "✅ NVM loaded from $NVM_DIR"
else
  echo "⚠️  NVM not found — ensure Node is installed on system PATH."
fi

# Ensure Node 18.x is available (adjust version as needed)
if command -v nvm >/dev/null 2>&1; then
  nvm install 18 >/dev/null 2>&1 || true
  nvm use 18 >/dev/null 2>&1 || true
fi

# Confirm Node + npm versions
echo "🟢 Node version: $(node -v 2>/dev/null || echo 'Not found')"
echo "🟣 npm version:  $(npm -v 2>/dev/null || echo 'Not found')"

if ! command -v node >/dev/null; then
  echo "❌ Node.js is not installed. Exiting."
  exit 1
fi

# -----------------------------
# ⚙️ PM2 setup
# -----------------------------
echo "🔧 Ensuring PM2 is available globally..."
npm install -g pm2 >/dev/null 2>&1 || true
export PATH="$PATH:$(npm config get prefix)/bin"

pm2 ping >/dev/null 2>&1 || echo "⚠️  PM2 not running yet — will start fresh."

# -----------------------------
# 🧹 Cleanup & Dependencies
# -----------------------------
echo "🧹 Cleaning old dependencies and cache..."
rm -rf node_modules
npm cache clean --force >/dev/null 2>&1

echo "📦 Installing dependencies..."
npm install --no-audit --no-fund

echo "🏗️  Building project..."
npm run build

# -----------------------------
# 🔄 Application (PM2) Restart
# -----------------------------
# Ensure start script is executable
chmod +x "${PROJECT_DIR}/scripts/start-server.sh" 2>/dev/null || true

if pm2 list | grep -q "proof-server"; then
  echo "🔄 Reloading existing 'proof-server' process..."
  pm2 delete proof-server >/dev/null 2>&1 || true
fi

echo "🚀 Starting 'proof-server' process with latest configuration..."
pm2 start ecosystem.config.js

pm2 save >/dev/null

echo ""
echo "✅ Deployment completed successfully at $(date)"
echo "-------------------------------------------"
