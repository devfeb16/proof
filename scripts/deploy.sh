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

# Reload PM2 with zero-downtime (or start if not running)
if pm2 list | grep -q "proof-server"; then
  pm2 reload proof-server --update-env
else
  pm2 start ecosystem.config.js
fi

pm2 save

echo "Deployment completed!"
