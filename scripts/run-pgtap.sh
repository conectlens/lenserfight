#!/usr/bin/env bash
# Phase 0 — pgTAP test runner.
#
# Runs every supabase/tests/*.sql file against the local Supabase database
# and reports pass/fail. Wraps `supabase db test` so contributors can invoke
# the suite via `pnpm test:db` without remembering the underlying command.
#
# Usage:
#   pnpm test:db                # run against local stack (must be started)
#   DB_URL=postgres://... pnpm test:db   # run against any reachable DB

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TESTS_DIR="$REPO_ROOT/supabase/tests"

if [[ ! -d "$TESTS_DIR" ]]; then
  echo "[test:db] No tests directory at $TESTS_DIR" >&2
  exit 1
fi

shopt -s nullglob
FILES=("$TESTS_DIR"/*.sql)
if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "[test:db] No .sql test files found in $TESTS_DIR" >&2
  exit 1
fi

echo "[test:db] Running ${#FILES[@]} pgTAP test file(s) from $TESTS_DIR"

if [[ -n "${DB_URL:-}" ]]; then
  # Direct psql path — useful for CI against a non-Supabase Postgres.
  for f in "${FILES[@]}"; do
    echo "[test:db] -> $(basename "$f")"
    psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$f"
  done
else
  # Local Supabase — supabase CLI handles connection details.
  cd "$REPO_ROOT"
  supabase db test
fi

echo "[test:db] All pgTAP suites passed."
