#!/usr/bin/env bash
# Validate an MCP tool file follows project conventions.
# Run from the repo root.
#
# Usage: bash scripts/validate-tool.sh <path/to/tool-file.ts>
# Exit code: 0 = OK, 1 = violations found

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: bash scripts/validate-tool.sh <file.ts>"
  exit 1
fi

FILE="$1"
ERRORS=0
WARNINGS=0

if [[ ! -f "$FILE" ]]; then
  echo "Error: file not found: $FILE"
  exit 1
fi

pass() { echo "  OK  $1"; }
fail() { echo " FAIL $1"; ERRORS=$((ERRORS + 1)); }
warn() { echo " WARN $1"; WARNINGS=$((WARNINGS + 1)); }

require() {
  local desc="$1" pattern="$2"
  grep -qE "$pattern" "$FILE" && pass "$desc" || fail "$desc"
}

echo "Validating: $FILE"
echo "---"

# Structure
require "exports registerXxx(server, sb)"   "export function register[A-Z][a-zA-Z]+\(server: McpServer, sb: SupabaseClient\)"
require "imports from ../../types.js"        "from '../../types\.js'"
require "uses zUuid for UUIDs"               "zUuid"
require "captures t0 before try"            "const t0 = Date\.now\(\)"
require "RPC uses 'as never' cast"           "as never"
require "checks error after RPC"             "if \(error\) throw new Error"
require "has NOT_FOUND or DB_ERROR fail"     "fail\('(NOT_FOUND|DB_ERROR)"

# Security
grep -qE "getServiceClient\(\)" "$FILE" \
  && fail "uses getServiceClient() inside tool (service-role leak)" \
  || pass "no service-role key in handler"

grep -qE "\.from\(['\"]" "$FILE" \
  && warn "direct table query (.from()) — use fn_mcp_* RPC instead" \
  || pass "no direct table queries"

# Naming: tool name in server.tool() must be verb_noun (verb-first snake_case)
TOOL_NAME=$(grep -oE "server\.tool\(\s*'[a-z_]+'" "$FILE" | grep -oE "'[a-z_]+'" | tr -d "'" || true)
if [[ -n "$TOOL_NAME" ]]; then
  KNOWN_VERBS="get list create update delete archive fork run search set submit retry summarize find validate extract add"
  FIRST_WORD="${TOOL_NAME%%_*}"
  if echo "$KNOWN_VERBS" | grep -wq "$FIRST_WORD"; then
    pass "tool name is verb-first ('$TOOL_NAME')"
  else
    fail "tool name '$TOOL_NAME' must start with a verb (e.g. get_, list_, create_, run_, set_)"
  fi

  # Warn if the domain word does not appear anywhere in the tool name
  DOMAIN=$(echo "$FILE" | grep -oE "tools/[a-z]+" | head -1 | sed 's|tools/||')
  if [[ -n "$DOMAIN" ]]; then
    # Accept both singular (lens) and plural (lenses/battles/workflows)
    if echo "$TOOL_NAME" | grep -qE "${DOMAIN}s?"; then
      pass "tool name contains domain ('$DOMAIN')"
    else
      warn "tool name '$TOOL_NAME' does not contain the domain ('$DOMAIN') — verify intentional"
    fi
  fi
fi

echo "---"
if [[ $ERRORS -eq 0 && $WARNINGS -eq 0 ]]; then
  echo "Result: OK"
elif [[ $ERRORS -eq 0 ]]; then
  echo "Result: OK with $WARNINGS warning(s)"
else
  echo "Result: $ERRORS violation(s), $WARNINGS warning(s)"
  exit 1
fi
