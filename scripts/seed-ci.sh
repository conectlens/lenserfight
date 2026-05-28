#!/usr/bin/env bash
# CI seed — minimal safe profiles only, with CI guard enforcement
set -euo pipefail

DB_URL="${LOCAL_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

echo "=== seed-ci: setting app.environment = 'ci' ==="
psql "$DB_URL" -c "SELECT set_config('app.environment', 'ci', false);"

echo "=== seed-ci: applying CI-safe seed files ==="
# Only apply the guard + safe profile seeds (02_ and 03_)
# Skip heavy/sensitive seeds (50_, 51_, demo data)
for f in supabase/seeds/00_ci_guard.sql \
          supabase/seeds/02_*.sql \
          supabase/seeds/03_*.sql 2>/dev/null; do
  [[ -f "$f" ]] || continue
  echo "  -> $f"
  psql "$DB_URL" -f "$f"
done

echo "=== seed-ci: complete ==="
