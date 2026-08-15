#!/usr/bin/env bash
set -eo pipefail

PORT="${PORT:-3000}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🚀 Starting Fantasy Football Wrapped Local Dev Instance..."
cd "$APP_DIR"

# 1. Check environment file
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  echo "⚠️ .env not found. Copying .env.example -> .env"
  cp .env.example .env
fi

# 2. Check dependencies
if [ ! -d "node_modules" ]; then
  echo "📦 Installing npm dependencies..."
  npm install
fi

# 3. Clear port if in use
OCCUPYING_PID=$(lsof -ti :"$PORT" 2>/dev/null || true)
if [ -n "$OCCUPYING_PID" ]; then
  echo "⚠️ Port $PORT is already in use by PID $OCCUPYING_PID. Terminating stale process..."
  kill -9 $OCCUPYING_PID 2>/dev/null || true
  sleep 1
fi

# 4. Start local development server (Express + Vite)
echo "🌐 Launching server on http://localhost:$PORT ..."
exec npm run dev
