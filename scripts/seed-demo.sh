#!/usr/bin/env bash
# Apply the combined demo seed against a local Supabase, injecting reserved-
# account passwords via PostgreSQL session GUCs so they never live in the
# committed seed SQL.
#
# Local default passwords are intentionally weak — they exist only so that
# `pnpm supabase:seed:demo` produces a usable dev environment on a fresh clone.
# Override per-account passwords in your shell or .env.local:
#
#   export SEED_LF_PASSWORD=...
#   export SEED_CHAINABIT_PASSWORD=...
#   export SEED_CONECTLENS_PASSWORD=...
#
# CI and deployment pipelines MUST set these to randomly generated values and
# rotate the auth.users rows immediately after the first apply.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_URL="${LOCAL_DB_URL:-postgresql://postgres:postgres@localhost:54322/postgres}"

case "$DB_URL" in
  *127.0.0.1*|*localhost*) : ;;
  *)
    echo "[seed-demo] refusing to run against non-local DB: $DB_URL" >&2
    exit 2
    ;;
esac

SEED_LF_PASSWORD="${SEED_LF_PASSWORD:-lenserfight-local-dev}"
SEED_CHAINABIT_PASSWORD="${SEED_CHAINABIT_PASSWORD:-chainabit-local-dev}"
SEED_CONECTLENS_PASSWORD="${SEED_CONECTLENS_PASSWORD:-conectlens-local-dev}"

bash "$REPO_ROOT/supabase/combine-seeds.sh"

PGOPTIONS="-c seed.lf_password=$SEED_LF_PASSWORD \
           -c seed.chainabit_password=$SEED_CHAINABIT_PASSWORD \
           -c seed.conectlens_password=$SEED_CONECTLENS_PASSWORD" \
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$REPO_ROOT/supabase/seed-data.sql"
