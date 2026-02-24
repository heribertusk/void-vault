#!/bin/bash

echo "🚀 Deploying VoidVault to Production..."

# 1. Deploy Cleanup Worker
echo "📦 Deploying cleanup worker (with cron trigger)..."
bunx wrangler deploy --config wrangler.worker.toml

# 2. Deploy Pages Project
echo "📄 Building and deploying pages project..."
bun run build:frontend
bun run copy:functions
bunx wrangler pages deploy dist --project-name=void-vault

echo "✅ Deployment complete!"
echo ""
echo "🔗 Live URL: https://void-vault-6qv.pages.dev"
echo "🔧 Cleanup Worker: void-vault-cleanup (runs hourly)"
