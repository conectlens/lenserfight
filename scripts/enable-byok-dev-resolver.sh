#!/usr/bin/env bash
# Enable the local-dev BYOK key resolver (fn_get_my_key_secret).
#
# The function is gated by a Postgres GUC (app.allow_dev_byok_resolver).
# Setting it at the database level requires a superuser. The postgres user in
# the Supabase local stack is NOT a superuser — supabase_admin is. That role
# only accepts local unix-socket connections which require scram-sha-256, but
# also accepts TCP connections from 127.0.0.1 via trust auth. So we connect
# inside the container via TCP.
#
# The container name is derived from project_id in supabase/config.toml so
# this script stays correct if the project is renamed.
#
# Usage:
#   pnpm supabase:enable-byok-resolver
#   bash scripts/enable-byok-dev-resolver.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PROJECT_ID=$(grep '^project_id' "$ROOT/supabase/config.toml" | sed 's/.*= *"\(.*\)"/\1/')
CONTAINER="supabase_db_${PROJECT_ID}"

echo "==> Project: $PROJECT_ID"
echo "==> Container: $CONTAINER"

if ! docker ps --format "{{.Names}}" | grep -q "^${CONTAINER}$"; then
  echo "ERROR: Container $CONTAINER is not running."
  echo "       Run 'pnpm supabase start' first."
  exit 1
fi

docker exec "$CONTAINER" \
  psql -h 127.0.0.1 -U supabase_admin postgres \
  -c "ALTER DATABASE postgres SET \"app.allow_dev_byok_resolver\" = 'true'; SELECT pg_reload_conf();"

echo ""
echo "Done. fn_get_my_key_secret is now enabled on the local DB."
echo "This setting persists until the DB is dropped (supabase stop --no-backup or db reset)."
