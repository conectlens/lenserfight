#!/usr/bin/env bash
# supabase/scripts/reset-linked.sh
#
# Drop competing connections on the linked remote before running
# `supabase db reset --linked`.
#
# Background workers (PostgREST schema reloader, pg_cron, autovacuum,
# Realtime) hold AccessShareLocks on schema objects while the Supabase
# CLI teardown block runs DROP SCHEMA … CASCADE sequentially.  When two
# DROP SCHEMA calls race against the same background lock the result is a
# deadlock (SQLSTATE 40P01) at an unpredictable schema — the error
# changes every run because the scheduler timing differs.
#
# This script terminates those idle/background connections first so the
# teardown block acquires locks without contention.
#
# Usage:
#   ./supabase/scripts/reset-linked.sh [extra supabase db reset flags]
#
# Requirements:
#   - SUPABASE_DB_URL env var set to the direct (non-pooler) connection
#     string of the linked remote, e.g.:
#       export SUPABASE_DB_URL="postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres"
#   - psql on PATH
#   - supabase CLI on PATH (pnpm exec supabase or global)

set -euo pipefail

DB_URL="${SUPABASE_DB_URL:-}"

if [[ -z "$DB_URL" ]]; then
  echo "ERROR: SUPABASE_DB_URL is not set." >&2
  echo "Export the direct connection string of your linked Supabase project:" >&2
  echo '  export SUPABASE_DB_URL="postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres"' >&2
  exit 1
fi

echo "==> Terminating competing backend connections on remote…"
psql "$DB_URL" --no-psqlrc -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE pid <> pg_backend_pid()
  AND backend_type IN (
    'client backend',
    'background worker'
  )
  AND query_start < now() - interval '2 seconds'
  AND state IN ('idle', 'idle in transaction', 'idle in transaction (aborted)');
" 2>&1 | grep -v "^$"

echo "==> Running supabase db reset --linked…"
pnpm exec supabase db reset --linked "$@"
