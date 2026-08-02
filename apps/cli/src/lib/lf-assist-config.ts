/**
 * Read/merge rules for the `.opencode/opencode.json` that `lf assist` generates.
 *
 * The config is a generated artifact, so an existing one must never block the
 * session. A config we wrote is refreshed in place (its plugin path is absolute
 * and install-specific, so an upgraded or relocated CLI leaves it dangling); a
 * config someone else wrote is merged into, never clobbered.
 */

export const PLUGIN_BASENAME = 'lf-plugin.js'

export interface OpencodeConfig {
  $schema?: string
  plugin?: unknown
  mcp?: Record<string, unknown>
  [key: string]: unknown
}

/** Basename comparison that tolerates both separators — configs travel across OSes. */
export function isPluginEntry(entry: unknown): boolean {
  return typeof entry === 'string' && entry.split(/[\\/]/).pop() === PLUGIN_BASENAME
}

/** The only keys `lf assist` ever writes when it authors a config from scratch. */
const LF_KEYS = new Set(['$schema', 'plugin', 'mcp'])

/**
 * True when the config holds nothing but what `lf` itself writes — i.e. we
 * authored the whole file and may safely rewrite it (which is how a stale,
 * install-specific plugin path gets refreshed).
 *
 * Deliberately stricter than "references our plugin": once we have merged into
 * someone else's config it also references our plugin, and rewriting *that*
 * would throw away their settings.
 */
export function isLfOnlyConfig(config: OpencodeConfig): boolean {
  if (!Object.keys(config).every((k) => LF_KEYS.has(k))) return false
  const { plugin } = config
  return Array.isArray(plugin) && plugin.length > 0 && plugin.every(isPluginEntry)
}

export function buildLfConfig(
  pluginPath: string,
  mcp: Record<string, unknown> | null,
): OpencodeConfig {
  return {
    $schema: 'https://opencode.ai/config.json',
    plugin: [pluginPath],
    ...(mcp ? { mcp } : {}),
  }
}

/**
 * Additively wire our plugin into a config we did not write (a hand-authored
 * OpenCode setup, or one left by another tool). Everything the user configured
 * is preserved and their `mcp` entries win on key collision.
 */
export function mergeLfConfig(
  existing: OpencodeConfig,
  pluginPath: string,
  mcp: Record<string, unknown> | null,
): OpencodeConfig {
  const plugin = (Array.isArray(existing.plugin) ? existing.plugin : []).filter(
    (p) => !isPluginEntry(p),
  )
  plugin.push(pluginPath)
  const mergedMcp = { ...(mcp ?? {}), ...(existing.mcp ?? {}) }
  return {
    ...existing,
    plugin,
    ...(Object.keys(mergedMcp).length > 0 ? { mcp: mergedMcp } : {}),
  }
}
