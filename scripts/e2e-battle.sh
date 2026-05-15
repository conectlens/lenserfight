#!/usr/bin/env bash
# Phase BI — end-to-end battle lifecycle orchestrator.
#
# Boots local Supabase, applies the e2e seed, runs the pgTAP lifecycle suite,
# and (optionally) drives the Vitest + CLI integration specs that round-trip
# against the running database.
#
# Designed to be safe both standalone and from CI. Refuses to run against
# anything that does not look like a local DB.
#
# Usage:
#   scripts/e2e-battle.sh                # full cycle
#   scripts/e2e-battle.sh --skip-vitest  # pgTAP + seed only
#   scripts/e2e-battle.sh --teardown     # stop supabase at the end

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKIP_VITEST=false
TEARDOWN=false
DB_URL_DEFAULT="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-vitest) SKIP_VITEST=true; shift ;;
    --teardown)    TEARDOWN=true;    shift ;;
    *) echo "[e2e-battle] unknown arg: $1" >&2; exit 1 ;;
  esac
done

DB_URL="${LOCAL_DB_URL:-$DB_URL_DEFAULT}"

# Refuse non-local DBs as a safety net — the seed inserts deterministic
# auth.users rows with known weak passwords and must NEVER touch a shared env.
case "$DB_URL" in
  *127.0.0.1*|*localhost*) : ;;
  *)
    echo "[e2e-battle] refusing to run against non-local DB: $DB_URL" >&2
    exit 2
    ;;
esac

cd "$REPO_ROOT"

echo "[e2e-battle] (1/4) supabase start"
if ! command -v supabase >/dev/null 2>&1; then
  echo "[e2e-battle] supabase CLI not installed — install https://supabase.com/docs/guides/cli" >&2
  exit 2
fi
supabase start >/dev/null

echo "[e2e-battle] (2/4) load e2e seed"
# Inject the e2e password via a PostgreSQL session GUC so it never lives in the
# committed seed file. Override by exporting E2E_SEED_PASSWORD before invoking.
E2E_SEED_PASSWORD="${E2E_SEED_PASSWORD:-E2E#TestSeed!}"
PGOPTIONS="-c seed.e2e_password=$E2E_SEED_PASSWORD" \
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$REPO_ROOT/supabase/seeds/52_battle_e2e_seed.sql"

echo "[e2e-battle] (3/4) pgTAP lifecycle suite"
LOCAL_DB_URL="$DB_URL" "$REPO_ROOT/scripts/run-pgtap.sh" --filter "51_battle_lifecycle_e2e"

if ! $SKIP_VITEST; then
  echo "[e2e-battle] (4/4) Vitest + CLI integration specs"
  export SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
  if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
    SUPABASE_SERVICE_ROLE_KEY="$(supabase status --output json 2>/dev/null \
      | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).SERVICE_ROLE_KEY||"")}catch{}})')"
    export SUPABASE_SERVICE_ROLE_KEY
  fi
  pnpm nx test repositories --testPathPatterns="battlesRepository.e2e.spec"
  pnpm nx test cli         --testPathPatterns="battle.e2e.spec"
else
  echo "[e2e-battle] (4/4) Vitest + CLI specs — skipped"
fi

if $TEARDOWN; then
  echo "[e2e-battle] teardown — supabase stop"
  supabase stop >/dev/null
fi

echo "[e2e-battle] OK"
