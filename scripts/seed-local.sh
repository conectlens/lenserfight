#!/usr/bin/env bash
# Local development seed — full reset + all seed files
set -euo pipefail

echo "=== seed-local: resetting local Supabase DB ==="
supabase db reset

echo "=== seed-local: setting app.environment = 'local' ==="
psql "${LOCAL_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}" \
  -c "SELECT set_config('app.environment', 'local', false);"

echo "=== seed-local: applying all seed files ==="
for f in supabase/seeds/*.sql; do
  echo "  -> $f"
  psql "${LOCAL_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}" -f "$f"
done

echo "=== seed-local: complete ==="
