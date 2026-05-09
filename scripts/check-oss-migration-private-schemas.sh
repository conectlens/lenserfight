#!/usr/bin/env bash
# Fails if the Community Edition migration references private-only schemas.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIG_DIR="${ROOT}/supabase/migrations"

if [[ ! -d "$MIG_DIR" ]]; then
  echo "ERROR: migrations directory not found: $MIG_DIR"
  exit 1
fi

# Private schemas belong to the Chainabit commercial backend and must not appear
# in new Community Edition migrations. The initial base schema (community_base_schema)
# is allowlisted because it was written before the OSS/private split was enforced
# and still contains legacy private schema stubs pending a dedicated strip migration.
PRIVATE=(
  authz battles benchmark billing organizations wallet xp
)

# community_base_schema is allowlisted until a dedicated strip migration removes
# the private schema stubs it contains. Do NOT add new files here.
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
