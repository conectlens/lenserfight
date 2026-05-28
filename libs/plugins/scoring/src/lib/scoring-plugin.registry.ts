/**
 * @experimental
 *
 * In-process registry for scoring plugins. Mirrors the shape of
 * libs/adapters/connector/src/lib/connector.registry.ts. RFC-0002 governs
 * the stability of the public API exposed by this module.
 */

import type { ScoringPluginV1 } from './scoring-plugin'

type PluginFactory = () => ScoringPluginV1

const PLUGINS = new Map<string, PluginFactory>()

/** @experimental */
export function registerScoringPlugin(id: string, factory: PluginFactory): void {
  if (!id) throw new Error('Scoring plugin id must be a non-empty string')
  PLUGINS.set(id, factory)
}

/** @experimental */
export function unregisterScoringPlugin(id: string): void {
  PLUGINS.delete(id)
}

/** @experimental */
export function getScoringPlugin(id: string): ScoringPluginV1 {
  const factory = PLUGINS.get(id)
  if (!factory) throw new Error(`Unknown scoring plugin: ${id}`)
  return factory()
}

/** @experimental */
export function listScoringPlugins(): string[] {
  return Array.from(PLUGINS.keys())
}

/**
 * @experimental
 * Test-only reset hook. Production code MUST NOT call this.
 */
export function __resetScoringRegistryForTests(): void {
  PLUGINS.clear()
}
