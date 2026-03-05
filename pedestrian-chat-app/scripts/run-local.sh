#!/usr/bin/env bash
# Build frontend and run backend for local testing.
# Set DATABRICKS_SERVER_HOSTNAME, DATABRICKS_TOKEN, GENIE_SPACE_ID before running.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
cd "$APP_DIR"

echo "Building frontend..."
cd frontend
npm ci --omit=optional 2>/dev/null || npm install
npm run build
cd ..

echo "Starting backend (serves frontend + /api/chat)..."
cd backend
python -m venv .venv 2>/dev/null || true
source .venv/bin/activate 2>/dev/null || .venv/Scripts/activate 2>/dev/null || true
pip install -q -r requirements.txt
export PORT="${PORT:-5000}"
echo "Open http://localhost:$PORT"
exec python main.py
