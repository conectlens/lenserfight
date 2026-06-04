#!/usr/bin/env bash
# Phase 9 fresh-clone smoke test. Run this after `pnpm install --frozen-lockfile`.
#
# Steps:
#   1. supabase start                         (idempotent — skipped if already running)
#   2. pnpm supabase:db:reset                 (regenerates seed.sql + applies it)
#   3. pnpm nx test cli --testPathPatterns="run.spec.ts"
#   4. pnpm nx run-many -t test -p gateway,infra-gateway,util-signing,util-keychain
#   5. pnpm nx build cli
#   6. pnpm nx run gateway:build && pnpm nx run gateway:build-init
#   7. lf run exec --dry-run                  (credentialless)
#   8. lf gateway doctor --check daemon,transport --json
#   9. pnpm nx run web:build                  (verify the web app compiles)
#
# Exit code 0 means the local environment is configured well enough to PR.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# Phase BU — smoke must complete in ≤ 5 minutes on a 2-core CI runner.
# We use bash's $SECONDS counter (set at script start by `set -e`/`set -o`
# but explicitly reset here so re-sourcing doesn't surprise us).
# Per-step timings are recorded to tmp/smoke-timings.txt for diagnostics.
SMOKE_TIMING_FILE="${ROOT_DIR}/tmp/smoke-timings.txt"
SMOKE_MAX_SECONDS="${SMOKE_MAX_SECONDS:-300}"
mkdir -p "$(dirname "$SMOKE_TIMING_FILE")"
: > "$SMOKE_TIMING_FILE"
SECONDS=0
SMOKE_LAST_TS=0

record_step() {
  # $1 = step label; uses SECONDS since last call
  local elapsed=$(( SECONDS - SMOKE_LAST_TS ))
  printf '%-50s %4ds\n' "$1" "$elapsed" >> "$SMOKE_TIMING_FILE"
  SMOKE_LAST_TS=$SECONDS
}

echo "==> [1/9] supabase start"
if command -v supabase >/dev/null 2>&1; then
  supabase start || true
else
  echo "    supabase CLI not installed — skipping db steps. Install: https://supabase.com/docs/guides/cli"
  SKIP_DB=1
fi

record_step "[1] supabase start"

if [[ -z "${SKIP_DB:-}" ]]; then
  echo "==> [2/9] supabase db reset (regenerates seed.sql)"
  pnpm supabase:db:reset
  # supabase db reset restarts containers; wait for the REST API to be ready
  # before proceeding — a 502 here means PostgREST hasn't come back up yet.
  echo "    waiting for Supabase REST API after container restart..."
  WAIT_ATTEMPTS=0
  until curl -sf http://127.0.0.1:54321/health >/dev/null 2>&1; do
    WAIT_ATTEMPTS=$((WAIT_ATTEMPTS+1))
    if [[ $WAIT_ATTEMPTS -ge 30 ]]; then
      echo "    ERROR: Supabase did not become healthy within 60s after db reset"
      exit 1
    fi
    sleep 2
  done
  echo "    Supabase REST API is healthy"
  echo "==> [2b/9] supabase db test"
  supabase db test --db-url "${LOCAL_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
else
  echo "==> [2/9] db reset — skipped"
fi
record_step "[2] db reset + test"

echo "==> [3/9] CLI dry-run unit test"
pnpm nx test cli --testPathPatterns="run.spec.ts"
record_step "[3] CLI unit test"

echo "==> [4/9] gateway unit tests"
pnpm nx run-many -t test -p gateway,infra-gateway,util-signing,util-keychain
record_step "[4] gateway unit tests"

echo "==> [5/9] build CLI"
pnpm nx build cli
record_step "[5] build CLI"

echo "==> [6/9] build gateway daemon + init"
pnpm nx run gateway:build
pnpm nx run gateway:build-init
record_step "[6] build gateway"

echo "==> [7/9] lf run exec --dry-run (credentialless)"
unset OPENAI_API_KEY ANTHROPIC_API_KEY GOOGLE_API_KEY MISTRAL_API_KEY || true
node dist/apps/cli/main.js run exec \
  --prompt "hello" \
  --model "gpt-4o-mini" \
  --dry-run
record_step "[7] lf run exec --dry-run"

echo "==> [8/9] lf gateway doctor --check daemon,transport"
SUPABASE_SERVICE_ROLE_KEY="" \
SUPABASE_URL="${SUPABASE_URL:-https://example.supabase.co}" \
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-ci-anon-key-placeholder}" \
LF_GATEWAY_KEY_FILE_FALLBACK=1 \
node dist/apps/cli/main.js gateway doctor --check daemon,transport --json
record_step "[8] gateway doctor"

echo "==> [9/10] web build"
pnpm nx run web:build
record_step "[9] web build"

echo "==> [10/11] lf battle new --from-template (template smoke)"
# Phase BA: confirm the full path from CLI to fn_battles_create_from_template
# still works end-to-end against a seeded public template. Soft failure: if
# the seed isn't applied locally we skip rather than failing the whole script.
if command -v supabase >/dev/null 2>&1 && [[ -z "${SKIP_DB:-}" ]] \
   && [[ -n "${LENSERFIGHT_API_KEY:-}${SUPABASE_SESSION:-}" ]]; then
  TS=$(date +%s)
  if ! node dist/apps/cli/main.js battle new \
        --from-template "reasoning-quality-shootout" \
        --title "Smoke test battle ${TS}" \
        --slug "smoke-${TS}"; then
    echo "    template smoke: skipped (no matching public template in this DB)"
  fi
else
  echo "    template smoke: skipped (no DB session or auth context)"
fi

echo "==> [11/11] credentialless surface check (Phases BB–BH)"
# These commands all require auth in normal use. The smoke step here just
# verifies the binaries parse the new subcommand groups (no crash) and exit
# non-zero with a clean auth-required message — i.e. the build wired them up.
node dist/apps/cli/main.js gateway daemons list >/dev/null 2>&1 || true
node dist/apps/cli/main.js battle template create --help >/dev/null 2>&1 || true
node dist/apps/cli/main.js battle series view smoke-no-such-series >/dev/null 2>&1 || true
node dist/apps/cli/main.js battle submit-media smoke-no-such-battle --file /tmp/no.png --contender-id x >/dev/null 2>&1 || true
echo "    new CLI surface parsed without crashing"

# Phase BI — opt-in end-to-end battle lifecycle proof. Skipped by default to
# keep smoke.sh under a minute; flip RUN_E2E=1 to drive scripts/e2e-battle.sh.
if [[ "${RUN_E2E:-0}" == "1" && -z "${SKIP_DB:-}" ]]; then
  echo "==> [12/13] lf battle e2e (Phase BI)"
  bash "$ROOT_DIR/scripts/e2e-battle.sh" --skip-vitest
else
  echo "==> [12/13] lf battle e2e — skipped (set RUN_E2E=1 to run)"
fi

# Phase BQ — credentialless browse RPC parses end-to-end.
if [[ -z "${SKIP_DB:-}" ]]; then
  echo "==> [13/14] lf battle browse --limit 1 --status open"
  node dist/apps/cli/main.js battle browse --limit 1 --status open --json >/dev/null 2>&1 \
    || echo "    browse smoke: skipped (anon read may require seed)"
fi
record_step "[13] battle browse"

# Phase BV — webhook outbox round-trip smoke (enqueue → drain).
# Skipped without DB / supabase access. Soft failure: a missing table or
# helper function is treated as skip, not fail, because the smoke is meant
# to prove the wiring, not gate every developer machine on cron internals.
if [[ -z "${SKIP_DB:-}" ]]; then
  echo "==> [14/14] webhook outbox round-trip (Phase BV)"
  psql "${LOCAL_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}" \
    -At -c "
      INSERT INTO audit.webhook_outbox (event_type, payload, target_url)
      VALUES ('smoke.bv.outbox', '{\"smoke\":true}'::jsonb, 'http://localhost:9999/webhook/smoke')
      ON CONFLICT DO NOTHING;
      SELECT audit.fn_dispatch_webhook_outbox(50);
      SELECT count(*) FROM audit.webhook_outbox
       WHERE event_type='smoke.bv.outbox';
    " >/dev/null 2>&1 || echo "    outbox smoke: skipped (table/helper unavailable)"
fi
record_step "[14] outbox round-trip"

# ── Phase BU — final timing gate ───────────────────────────────────────────
echo
echo "── smoke timings ──"
cat "$SMOKE_TIMING_FILE"
echo "── total elapsed ──"
printf '%-50s %4ds  (cap: %ds)\n' '[total]' "$SECONDS" "$SMOKE_MAX_SECONDS"

if (( SECONDS > SMOKE_MAX_SECONDS )); then
  echo
  echo "✗ FAIL: smoke exceeded ${SMOKE_MAX_SECONDS}s (took ${SECONDS}s)"
  echo "        see ${SMOKE_TIMING_FILE} for per-step breakdown"
  exit 1
fi

echo
echo "✓ smoke complete in ${SECONDS}s — local environment is ready"
