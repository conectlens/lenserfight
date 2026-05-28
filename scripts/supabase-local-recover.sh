#!/usr/bin/env bash
# Fix PostgREST "schema … does not exist" / 503 when local Docker restored a DB volume
# without running migrations (stale backup).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> [1/4] Stop stack and drop local Docker volumes (--no-backup)"
supabase stop --no-backup || true

echo "==> [2/4] Regenerate supabase/seed.sql"
bash supabase/combine-seeds.sh

echo "==> [3/4] Start stack"
supabase start --ignore-health-check

echo "==> [4/4] Apply migrations + seed"
supabase db reset --local --yes

echo ""
echo "Done. Verify: supabase status"
