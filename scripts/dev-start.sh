#!/usr/bin/env bash
# CE: dev-start.sh — start the full local dev stack in ≤5 min
# Usage: ./scripts/dev-start.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; RESET='\033[0m'

log_ok()   { echo -e "${GREEN}✓${RESET} $1"; }
log_warn() { echo -e "${YELLOW}!${RESET} $1"; }
log_err()  { echo -e "${RED}✗${RESET} $1"; }

# ---------------------------------------------------------------------------
# 1. Prereq checks
# ---------------------------------------------------------------------------
MISSING=0

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    log_err "Missing: $1  →  $2"
    MISSING=1
  else
    log_ok "$1 found"
  fi
}

echo ""
echo "Checking prerequisites..."
check_cmd docker  "https://docs.docker.com/get-docker/"
check_cmd node    "https://nodejs.org"
check_cmd pnpm    "npm install -g pnpm"

# Node ≥20
NODE_VER=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 20 ]; then
  log_err "Node ≥20 required (found v${NODE_VER})  →  https://nodejs.org"
  MISSING=1
else
  log_ok "node v${NODE_VER} (≥20)"
fi

if [ "$MISSING" -ne 0 ]; then
  echo ""
  log_err "Please install the missing prerequisites and re-run."
  exit 1
fi

# ---------------------------------------------------------------------------
# 2. .env.development.local — copy example if absent
# ---------------------------------------------------------------------------
if [ ! -f .env.development.local ] && [ -f .env.development.example ]; then
  cp .env.development.example .env.development.local
  log_ok "Created .env.development.local from example"
fi

# ---------------------------------------------------------------------------
# 3. Start Supabase and wait for health
# ---------------------------------------------------------------------------
echo ""
echo "Starting Supabase local stack..."
pnpm supabase start

SUPABASE_HEALTH_URL="http://localhost:54321/health"
echo "Waiting for Supabase health at ${SUPABASE_HEALTH_URL}..."
ATTEMPTS=0
until curl -sf "$SUPABASE_HEALTH_URL" >/dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS+1))
  if [ "$ATTEMPTS" -ge 60 ]; then
    log_err "Supabase did not become healthy within 60 seconds."
    log_warn "Run 'pnpm supabase logs' to diagnose."
    exit 1
  fi
  sleep 2
done
log_ok "Supabase is healthy"

# ---------------------------------------------------------------------------
# 4. Seed local database
# ---------------------------------------------------------------------------
echo ""
echo "Seeding local database..."
if [ -f scripts/seed-local.sh ]; then
  bash scripts/seed-local.sh
else
  pnpm supabase db reset --local 2>&1 | tail -5
fi
log_ok "Database seeded"

# ---------------------------------------------------------------------------
# 5. Start worker in background (ECHO_PROVIDER=1)
# ---------------------------------------------------------------------------
echo ""
echo "Starting worker (echo mode)..."
ECHO_PROVIDER=1 pnpm nx serve worker &
PLATFORM_PID=$!
echo "$PLATFORM_PID" > /tmp/lf-worker.pid
log_ok "worker started (PID ${PLATFORM_PID})"

# ---------------------------------------------------------------------------
# 6. Print URL table
# ---------------------------------------------------------------------------
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Service             URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Web app             http://localhost:3000"
echo "  Supabase Studio     http://localhost:54323"
echo "  Supabase API        http://localhost:54321"
echo "  Supabase MailHog    http://localhost:54324"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  (worker runs in background, no HTTP port)"
echo ""
log_ok "Dev stack is running. Open http://localhost:3000 in your browser."
echo ""
echo "  Start web app:    pnpm nx serve web"
echo "  Stop everything:  ./scripts/dev-teardown.sh"
echo ""
