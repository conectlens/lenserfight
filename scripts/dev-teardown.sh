#!/usr/bin/env bash
# CE: dev-teardown.sh — stop and clean up the local dev stack
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Stop worker background process if PID file exists
if [ -f /tmp/lf-worker.pid ]; then
  PID=$(cat /tmp/lf-worker.pid)
  kill "$PID" 2>/dev/null && echo "Stopped worker (PID $PID)" || true
  rm -f /tmp/lf-worker.pid
fi

pnpm supabase stop --no-backup 2>&1 | tail -3

docker system prune -f --volumes 2>&1 | tail -3

echo "✓ clean"
