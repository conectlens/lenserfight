#!/usr/bin/env bash
# Validates that supabase/migrations/ contains no private-platform schema objects.
# Checks SQL structure (CREATE TABLE, CREATE FUNCTION, etc.) — not comments/values.
#
# Usage:
#   bash scripts/validate-oss-migrations.sh

set -euo pipefail

MIGRATIONS_DIR="supabase/migrations"
CONFIG_FILE="supabase/config.toml"

# Private schema names that must never have table/function/trigger objects in OSS.
# Creating an empty schema for grant compat is allowed; creating objects is not.
PRIVATE_SCHEMAS=("billing" "wallet" "subscriptions" "lemon_squeezy" "cf_workers")

# Patterns that indicate an object is being created inside a private schema.
# These match: CREATE TABLE "billing"., ALTER TABLE billing., etc.
build_schema_object_pattern() {
  local schemas=("$@")
  local pattern=""
  for s in "${schemas[@]}"; do
    [ -n "$pattern" ] && pattern="$pattern|"
    # Matches: CREATE/ALTER/DROP TABLE/FUNCTION/TRIGGER/INDEX "schema". or schema.
    pattern="${pattern}(CREATE|ALTER|DROP).*(TABLE|FUNCTION|TRIGGER|INDEX|POLICY|VIEW|TYPE|SEQUENCE)[[:space:]]+(IF[[:space:]]+(NOT[[:space:]]+)?EXISTS[[:space:]]+)?[\"']?${s}[\"']?\."
  done
  echo "$pattern"
}

FOUND=0

# --- 1. Validate config.toml schemas allowlist ---
echo "==> Checking config.toml schemas..."
for schema in "${PRIVATE_SCHEMAS[@]}"; do
  if grep -i "schemas\s*=" "$CONFIG_FILE" | grep -qi "\"$schema\""; then
    echo "❌ config.toml exposes private schema '$schema' in [api] schemas."
    echo "   This means supabase db pull will capture private data."
    FOUND=$((FOUND + 1))
  fi
done

if [ "$FOUND" -eq 0 ]; then
  echo "   ✓ config.toml schemas are OSS-only"
fi

# --- 2. Scan migrations for private schema object creation ---
echo "==> Scanning $MIGRATIONS_DIR for private schema objects..."

PATTERN=$(build_schema_object_pattern "${PRIVATE_SCHEMAS[@]}")

while IFS= read -r -d '' file; do
  # Strip SQL comments before scanning to avoid false positives
  stripped=$(sed 's/--[^\n]*//g' "$file")
  matches=$(echo "$stripped" | grep -inE "$PATTERN" || true)
  if [ -n "$matches" ]; then
    echo "❌ Private schema object found in $(basename "$file"):"
    echo "$matches" | head -5 | sed 's/^/   /'
    FOUND=$((FOUND + 1))
  fi
done < <(find "$MIGRATIONS_DIR" -name "*.sql" -print0 2>/dev/null)

if [ "$FOUND" -gt 0 ]; then
  echo ""
  echo "❌ $FOUND issue(s) detected."
  echo "   Private schema objects belong in lenserfight-platform/supabase/migrations/"
  echo "   Empty schema shells (CREATE SCHEMA) are allowed for grant compatibility."
  exit 1
fi

echo "   ✓ No private schema objects found"
echo ""
echo "✅ OSS migration guard passed."
