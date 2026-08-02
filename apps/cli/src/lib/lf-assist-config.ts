/**
 * Read/merge rules for the `.lenserfight/lenserfight.json` that `lf assist`
 * generates.
 *
 * `lf`'s own commands ship natively inside the assist runtime (see
 * vendor/opencode/packages/opencode/src/plugin/index.ts's `internalPlugins`),
 * so this file's only job is carrying over this project's `mcp` server config
 * — there's no plugin path to keep fresh. The config is a generated artifact,
 * so an existing one must never block the session: we only ever add/refresh
 * our `mcp` key, additively, so a hand-authored config is always safe to
 * merge into rather than needing a "did we write this file" distinction.
 */

export interface AssistConfig {
  $schema?: string
  mcp?: Record<string, unknown>
  [key: string]: unknown
}

export function buildLfConfig(mcp: Record<string, unknown> | null): AssistConfig | null {
  if (!mcp) return null
  return { mcp }
}

/** Additively merges this project's `mcp` config into whatever's already there — the user's own entries win on key collision. */
export function mergeLfConfig(
  existing: AssistConfig,
  mcp: Record<string, unknown> | null,
): AssistConfig {
  if (!mcp) return existing
  const mergedMcp = { ...mcp, ...(existing.mcp ?? {}) }
  return { ...existing, mcp: mergedMcp }
}
