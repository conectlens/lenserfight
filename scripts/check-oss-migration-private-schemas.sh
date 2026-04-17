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

fail=0
for f in "$MIG_DIR"/*.sql; do
  [[ -e "$f" ]] || continue
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
