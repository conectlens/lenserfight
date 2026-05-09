#!/usr/bin/env bash
# Fails if the Community Edition migration references private-only schemas.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIG_DIR="${ROOT}/supabase/migrations"

if [[ ! -d "$MIG_DIR" ]]; then
  echo "ERROR: migrations directory not found: $MIG_DIR"
  exit 1
fi

# Must match lenserfight-platform/scripts/oss-migration-workflow.sh (private list).
PRIVATE=(
  analytics audit authz battles benchmark billing core integrations
  organizations reputation status wallet xp
)

# Migrations listed here are grandfathered: they predate strict OSS/platform split
# automation. New migrations must not add CREATE SCHEMA for private-only namespaces.
ALLOWLIST=(
  "20260329120000_platform_private_schema.sql"
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
  echo "Private schemas belong in lenserfight-platform only."
  exit 1
fi

echo "OK: OSS migrations contain no CREATE SCHEMA for private schemas."
