#!/usr/bin/env bash
# CE: dev-teardown.sh — stop and clean up the local dev stack
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Stop platform-api background process if PID file exists
if [ -f /tmp/lf-platform-api.pid ]; then
  PID=$(cat /tmp/lf-platform-api.pid)
  kill "$PID" 2>/dev/null && echo "Stopped platform-api (PID $PID)" || true
  rm -f /tmp/lf-platform-api.pid
fi

pnpm supabase stop --no-backup 2>&1 | tail -3

docker system prune -f --volumes 2>&1 | tail -3

echo "✓ clean"
