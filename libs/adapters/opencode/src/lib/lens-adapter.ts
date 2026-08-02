import { callRpc } from '@lenserfight/cli-client'
import { tool } from '@opencode-ai/plugin'

import type { OpencodeToolAdapterV1, OpencodeToolMetadata } from './opencode-tool-adapter'

// `tool.schema` is the zod instance @opencode-ai/plugin's own `tool()` factory
// expects — it pins an exact zod version internally, so building args with
// this repo's own top-level `zod` import produces a structurally
// incompatible type (`_zod.version.minor` mismatch) even though both are
// nominally "zod v4". Always build tool args off `tool.schema`, not `zod`.
const z = tool.schema

/** Mirrors apps/mcp-server/src/types.ts `zUuid` — accepts any 8-4-4-4-12 hex
 * UUID regardless of version/variant bits, unlike zod's stricter `.uuid()`. */
const zUuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'must be a valid UUID')

interface LensVersionParam {
  id: string
  label: string
  optional: boolean
}

interface ResolveTemplateResult {
  title: string | null
  description: string | null
  template_body: string
  parameters: LensVersionParam[] | null
  version_id: string
}

/**
 * Mirrors the `[[:param_id]]` substitution done by the MCP `run_lens` tool
 * (apps/mcp-server/src/tools/lens/lens-run.ts:resolveTemplate). Duplicated
 * rather than imported — libs/adapters/opencode (layer:infra) cannot depend
 * on apps/mcp-server (an app) under this repo's Nx boundary rules.
 */
function resolveTemplate(
  body: string,
  params: LensVersionParam[],
  values: Record<string, string>,
): { resolved: string; missing: string[] } {
  let resolved = body
  const missing: string[] = []
  for (const param of params) {
    const token = `[[:${param.id}]]`
    const value =
      values[param.label] ??
      values[param.label.toLowerCase()] ??
      Object.entries(values).find(([k]) => k.toLowerCase() === param.label.toLowerCase())?.[1]
    if (value !== undefined) {
      resolved = resolved.split(token).join(value)
    } else if (!param.optional) {
      missing.push(param.label)
    } else {
      resolved = resolved.split(token).join('')
    }
  }
  return { resolved, missing }
}

/**
 * Wraps the same `fn_mcp_lens_resolve_template` RPC the MCP `run_lens` tool
 * calls, but through `@lenserfight/cli-client`'s `callRpc` (user auth token)
 * rather than the MCP server's service-role Supabase client — this adapter
 * runs inside the OpenCode plugin process, not the server.
 */
export function createLensRunAdapter(): OpencodeToolAdapterV1 {
  const metadata: OpencodeToolMetadata = {
    description: 'Resolve a LenserFight lens template into a ready-to-run prompt.',
    mirrorsMcpTool: 'run_lens',
  }

  return {
    id: () => 'lf_lens_run',
    metadata: () => metadata,
    toToolDefinition: () =>
      tool({
        description: metadata.description,
        args: {
          lens_id: zUuid.describe('UUID of the lens to run.'),
          version_id: zUuid.optional().describe('UUID of a specific lens version; omit for the head version.'),
          param_values: z
            .record(z.string(), z.string())
            .default({})
            .describe('Values for the lens template parameters, keyed by parameter label.'),
        },
        async execute(rawArgs) {
          const { lens_id: lensId, version_id: versionId, param_values: paramValues } = rawArgs

          const data = await callRpc<ResolveTemplateResult | null>(
            'fn_mcp_lens_resolve_template',
            { p_lens_id: lensId, p_version_id: versionId ?? null },
            { requireAuth: true },
          )

          if (!data) return `Lens ${lensId} not found.`

          const { resolved, missing } = resolveTemplate(data.template_body, data.parameters ?? [], paramValues)
          if (missing.length > 0) {
            return `Lens "${data.title ?? lensId}" needs ${missing.length} more parameter(s): ${missing.join(', ')}.`
          }

          return {
            title: `Resolved lens: ${data.title ?? lensId}`,
            output: resolved,
            metadata: { lens_id: lensId, version_id: data.version_id },
          }
        },
      }),
  }
}
