#!/usr/bin/env bash
# Phase 0 — pgTAP test runner.
#
# Runs every supabase/tests/*.sql file against the local Supabase database
# and reports pass/fail.
#
# Usage:
#   pnpm test:db                          # run all tests
#   pnpm test:db --filter rls             # run only files matching 'rls'
#   pnpm test:db --parallel               # run tests in parallel (xargs -P 4)
#   DB_URL=postgres://... pnpm test:db    # run against any reachable DB

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TESTS_DIR="$REPO_ROOT/supabase/tests"
FILTER=""
PARALLEL=false

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --filter)
      FILTER="$2"
      shift 2
      ;;
    --parallel)
      PARALLEL=true
      shift
      ;;
    *)
      echo "[test:db] Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ ! -d "$TESTS_DIR" ]]; then
  echo "[test:db] No tests directory at $TESTS_DIR" >&2
  exit 1
fi

shopt -s nullglob
ALL_FILES=("$TESTS_DIR"/*.sql)

if [[ -n "$FILTER" ]]; then
  FILES=()
  for f in "${ALL_FILES[@]}"; do
    if echo "$(basename "$f")" | grep -q "$FILTER"; then
      FILES+=("$f")
    fi
  done
else
  FILES=("${ALL_FILES[@]}")
fi

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "[test:db] No .sql test files found matching filter '${FILTER:-*}'" >&2
  exit 1
fi

echo "[test:db] Running ${#FILES[@]} pgTAP test file(s) (filter: '${FILTER:-*}')"

run_file() {
  local f="$1"
  echo "[test:db] -> $(basename "$f")"
  if [[ -n "${DB_URL:-}" ]]; then
    psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$f"
  else
    cd "$REPO_ROOT" && supabase db test --db-url "${LOCAL_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}" "$f"
  fi
}

export -f run_file
export REPO_ROOT DB_URL="${DB_URL:-}"

if $PARALLEL; then
  printf '%s\n' "${FILES[@]}" | xargs -P 4 -I{} bash -c 'run_file "$@"' _ {}
else
  EXIT_CODE=0
  for f in "${FILES[@]}"; do
    if ! run_file "$f"; then
      EXIT_CODE=1
    fi
  done
fi

if [[ "${EXIT_CODE:-0}" -ne 0 ]]; then
  echo "[test:db] One or more pgTAP suites failed." >&2
  exit "$EXIT_CODE"
fi

echo "[test:db] All pgTAP suites passed."
