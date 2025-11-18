#!/bin/bash
set -e

cd /root/proof

echo "Pulling latest code..."
git fetch origin main
git reset --hard origin/main

echo "Installing dependencies..."
npm install

echo "Building application..."
npm run build

echo "Starting/restarting PM2 process..."
pm2 delete proof-server 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo "Deployment completed!"
