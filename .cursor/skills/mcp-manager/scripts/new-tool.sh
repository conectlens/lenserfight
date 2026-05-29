#!/usr/bin/env bash
# Scaffold a new MCP tool file with the correct template.
# Run from the repo root.
#
# Usage: bash scripts/new-tool.sh <domain> <action>
# Example: bash scripts/new-tool.sh lens pin
#          → creates apps/mcp-server/src/tools/lens/lens-pin.ts
#            tool name: pin_lens  |  RPC: fn_mcp_lens_pin
#
#          bash scripts/new-tool.sh lens get-version
#          → creates apps/mcp-server/src/tools/lens/lens-get-version.ts
#            tool name: get_lens_version  |  RPC: fn_mcp_lens_get_version

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage:   bash scripts/new-tool.sh <domain> <action>"
  echo "Domains: lens | battle | workflow"
  echo "Example: bash scripts/new-tool.sh lens pin"
  echo "         bash scripts/new-tool.sh lens get-version"
  exit 1
fi

DOMAIN="$1"
ACTION="$2"
FILE="apps/mcp-server/src/tools/${DOMAIN}/${DOMAIN}-${ACTION}.ts"

# Split action on hyphens into words
IFS='-' read -ra ACTION_WORDS <<< "$ACTION"
VERB="${ACTION_WORDS[0]}"

# Tool name: verb_domain_[rest...] — verb-first so AI agents can group by action
# Exception: compound verbs (3+ action words, e.g. find-and-run) keep full action first.
NUM_WORDS=${#ACTION_WORDS[@]}
if [[ $NUM_WORDS -ge 3 ]]; then
  # Compound verb: full_action_domain (e.g. find_and_run_lens)
  TOOL_NAME="${ACTION//-/_}_${DOMAIN}"
else
  # Simple/two-word: verb_domain_[rest] (e.g. get_lens_version)
  TOOL_NAME="${VERB}_${DOMAIN}"
  for i in "${!ACTION_WORDS[@]}"; do
    if [[ $i -gt 0 ]]; then
      TOOL_NAME="${TOOL_NAME}_${ACTION_WORDS[$i]}"
    fi
  done
fi

# RPC name: fn_mcp_domain_action — domain-first, mirrors file stem
RPC_ACTION="${ACTION//-/_}"
RPC_NAME="fn_mcp_${DOMAIN}_${RPC_ACTION}"

# Export function name: registerDomainAction — PascalCase each word
cap() { local w="$1"; printf '%s%s' "$(printf '%s' "${w:0:1}" | tr '[:lower:]' '[:upper:]')" "${w:1}"; }
FUNC_DOMAIN="$(cap "$DOMAIN")"
FUNC_ACTION=""
for w in "${ACTION_WORDS[@]}"; do
  FUNC_ACTION="${FUNC_ACTION}$(cap "$w")"
done
FUNC="register${FUNC_DOMAIN}${FUNC_ACTION}"

if [[ ! -d "apps/mcp-server/src/tools/${DOMAIN}" ]]; then
  echo "Error: domain directory not found: apps/mcp-server/src/tools/${DOMAIN}"
  echo "       Use an existing domain or create the directory first."
  exit 1
fi

if [[ -f "$FILE" ]]; then
  echo "Error: $FILE already exists."
  exit 1
fi

cat > "$FILE" << TEMPLATE
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function ${FUNC}(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    '${TOOL_NAME}',
    'TODO: one sentence — what the tool does for the caller.',
    {
      // TODO: add zod schema fields
      // id: zUuid,
    },
    async (args) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('${RPC_NAME}' as never, {
          // TODO: map args to RPC params
        })) as unknown as { data: unknown; error: { message: string } | null };
        if (error) throw new Error(error.message);
        if (!data) return fail('NOT_FOUND', 'Resource not found', {}, '${TOOL_NAME}', t0);
        return ok(data, '${TOOL_NAME}', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, '${TOOL_NAME}', t0);
      }
    }
  );
}
TEMPLATE

echo "Created: $FILE"
echo ""
echo "  Tool name : ${TOOL_NAME}  ← VERIFY: adjust if the action is a noun phrase (e.g. 'run-logs' → get_workflow_run_logs)"
echo "  RPC name  : ${RPC_NAME}"
echo "  Export    : ${FUNC}"
echo ""
echo "Next steps:"
echo "  1. Fill in the schema and RPC params in $FILE"
echo "  2. Add to tools/${DOMAIN}/index.ts:"
echo "       import { ${FUNC} } from './${DOMAIN}-${ACTION}.js';"
echo "       ${FUNC}(server, sb);"
echo "  3. Update docs/en/reference/mcp-server/tools-${DOMAIN}.md"
echo "  4. Run: bash scripts/validate-tool.sh $FILE"
