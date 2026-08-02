import type { RpcCaller } from './rpc-caller'
import type { LensExportPayload } from '@lenserfight/shared/serializers'

interface LensGetVersion {
  semver?: string | null
  template_body?: string | null
  parameters?: Array<{ label?: string; optional?: boolean }> | null
}

interface LensGetRow {
  id: string
  title?: string | null
  description?: string | null
  content?: string | null
  head_version?: LensGetVersion | null
  tags?: Array<{ slug?: string }> | null
}

/**
 * Composes a LensExportPayload from `fn_mcp_lens_get`, which already
 * nests the head version's template_body/parameters — no second RPC
 * round-trip needed for a single-lens export.
 *
 * Lenses in this schema have no `slug` column (id is the only stable
 * identifier); the id is used as the payload's `slug` field, matching
 * ExportOrchestrator's own fallback (it prefers `title` for the
 * filename whenever `slug` looks like a UUID).
 */
export async function composeLensPayload(rpc: RpcCaller, lensId: string): Promise<LensExportPayload> {
  const row = await rpc<LensGetRow | null>('fn_mcp_lens_get', { p_lens_id: lensId })
  if (!row) throw new Error(`Lens not found: ${lensId}`)

  const headVersion = row.head_version ?? null
  const parameters = (headVersion?.parameters ?? [])
    .filter((p): p is { label: string; optional?: boolean } => Boolean(p.label))
    .map((p) => ({
      label: p.label,
      type: 'string',
      required: !p.optional,
    }))

  return {
    id: row.id,
    slug: row.id,
    title: row.title ?? row.id,
    body: headVersion?.template_body ?? row.content ?? null,
    version: headVersion?.semver ?? null,
    tags: (row.tags ?? []).map((t) => t.slug).filter((slug): slug is string => Boolean(slug)),
    parameters,
  }
}
