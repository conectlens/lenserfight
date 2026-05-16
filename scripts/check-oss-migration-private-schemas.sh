#!/usr/bin/env bash
# Fails if the Community Edition migration references private-only schemas.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIG_DIR="${ROOT}/supabase/migrations"

if [[ ! -d "$MIG_DIR" ]]; then
  echo "ERROR: migrations directory not found: $MIG_DIR"
  exit 1
fi

# Schemas that belong exclusively to the Chainabit commercial backend.
# battles and xp are Community Edition features and must NOT appear here.
# (The legacy `benchmark` schema was dropped from the active product; see 20280101000000_drop_benchmark_feature.sql.)
PRIVATE=(
  authz billing organizations wallet
)

# community_base_schema is allowlisted because it is an already-deployed migration
# that cannot be edited in place. 20260330000000_drop_private_schema_stubs.sql
# drops all four private schemas immediately after on every db:reset.
# Do NOT add any other file to this list.
ALLOWLIST=(
  "20260329120000_community_base_schema.sql"
)

fail=0
for f in "$MIG_DIR"/*.sql; do
  [[ -e "$f" ]] || continue
  base="$(basename "$f")"
  skip=0
  for allowed in "${ALLOWLIST[@]}"; do
    if [[ "$base" == "$allowed" ]]; then
      skip=1
      break
    fi
  done
  if [[ "$skip" -eq 1 ]]; then
    continue
  fi
  for schema in "${PRIVATE[@]}"; do
    if grep -qF "CREATE SCHEMA IF NOT EXISTS \"${schema}\"" "$f" 2>/dev/null; then
      echo "ERROR: OSS migration $(basename "$f") creates private schema: ${schema}"
      fail=1
    fi
    if grep -qF "CREATE SCHEMA \"${schema}\"" "$f" 2>/dev/null; then
      echo "ERROR: OSS migration $(basename "$f") creates private schema: ${schema}"
      fail=1
    fi
  done
done

if [[ "$fail" -ne 0 ]]; then
  echo ""
  echo "Private schemas belong in the Chainabit backend only, not Community Edition migrations."
  exit 1
fi

echo "OK: OSS migrations contain no CREATE SCHEMA for private schemas."
