#!/usr/bin/env bash
# CE: smoke-dev.sh — fast smoke test of the local dev stack
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

GREEN='\033[0;32m'; RED='\033[0;31m'; RESET='\033[0m'
PASS=0; FAIL=0; START=$(date +%s)

step_ok()   { echo -e "${GREEN}PASS${RESET} $1"; PASS=$((PASS+1)); }
step_fail() { echo -e "${RED}FAIL${RESET} $1"; FAIL=$((FAIL+1)); }

# ---------------------------------------------------------------------------
# 1. Ensure Supabase is running
# ---------------------------------------------------------------------------
if ! curl -sf http://localhost:54321/health >/dev/null 2>&1; then
  echo "Supabase not running — starting..."
  pnpm supabase start 2>&1 | tail -3
fi

# ---------------------------------------------------------------------------
# 2. lf battle browse --limit 1
# ---------------------------------------------------------------------------
if pnpm nx run cli:build --skip-nx-cache 2>/dev/null; then
  if node dist/apps/cli/main.js battle browse --limit 1 --json 2>&1 | grep -q '\['; then
    step_ok "lf battle browse --limit 1"
  else
    step_fail "lf battle browse --limit 1 returned no results"
  fi
else
  step_fail "CLI build failed"
fi

# ---------------------------------------------------------------------------
# 3. Fast pgTAP subset (tests 00–10)
# ---------------------------------------------------------------------------
PGTAP_FILES=$(ls supabase/tests/0*.sql supabase/tests/1*.sql 2>/dev/null | head -20)
if [ -n "$PGTAP_FILES" ]; then
  FAILED_TESTS=()
  for f in $PGTAP_FILES; do
    if pnpm supabase test --file "$f" 2>&1 | grep -q 'not ok'; then
      FAILED_TESTS+=("$f")
    fi
  done
  if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
    step_ok "pgTAP fast subset (00–10)"
  else
    step_fail "pgTAP failures: ${FAILED_TESTS[*]}"
  fi
else
  step_ok "pgTAP fast subset (no files found — skipped)"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
END=$(date +%s)
ELAPSED=$((END-START))
echo ""
echo "Smoke results: ${PASS} passed, ${FAIL} failed  (${ELAPSED}s)"
echo ""

if [ $FAIL -ne 0 ]; then
  exit 1
fi
