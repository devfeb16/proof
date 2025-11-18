#!/bin/bash
set -e

cd /root/proof

# Pull latest code
git fetch origin main
git reset --hard origin/main

# Install dependencies
npm install

# Build application
npm run build

# Make start script executable
chmod +x scripts/start-server.sh

# Restart PM2
pm2 delete proof-server 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo "Deployment completed!"
