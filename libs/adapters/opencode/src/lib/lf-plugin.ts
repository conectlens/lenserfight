import { readFileSync } from 'node:fs'

import type { Hooks, Plugin } from '@opencode-ai/plugin'

import { createBattleCreateAdapter } from './battle-adapter'
import { createCliBridgeAdapter, type CliToolManifest } from './cli-bridge-adapter'
import { createLensRunAdapter } from './lens-adapter'
import {
  getOpencodeToolAdapter,
  listOpencodeToolAdapters,
  registerOpencodeToolAdapter,
} from './opencode.registry'

registerOpencodeToolAdapter('lf_lens_run', createLensRunAdapter)
registerOpencodeToolAdapter('lf_battle_create', createBattleCreateAdapter)

/** Registers one generic cli-bridge tool per manifest entry (see
 * apps/cli/src/lib/cli-tool-bridge.ts) — read lazily, at plugin-load
 * time, since the manifest is generated per-project by `lf assist`, not
 * known when this plugin bundle itself was built.
 *
 * Manifest path travels via LF_ASSIST_MANIFEST_PATH (set by `lf assist`
 * on the spawned assist runtime's env) — a plain env var, not config-file
 * plumbing, since this plugin is baked into the assist runtime natively
 * (see vendor/opencode/packages/opencode/src/plugin/index.ts's
 * `internalPlugins`) rather than loaded from a `plugin:` config array. */
function registerCliBridgeTools(): void {
  const manifestPath = process.env['LF_ASSIST_MANIFEST_PATH']
  if (!manifestPath) return

  let manifest: CliToolManifest
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as CliToolManifest
  } catch {
    return // missing/unreadable manifest — fall back to the static adapters only
  }
  for (const entry of manifest.tools) {
    registerOpencodeToolAdapter(entry.id, () => createCliBridgeAdapter(entry, manifest.cliBinaryPath))
  }
}

/**
 * The assist runtime's built-in LenserFight plugin — registered natively in
 * `internalPlugins()` (see vendor/opencode/packages/opencode/src/plugin/index.ts),
 * not loaded from a config file. Walks the adapter registry and exposes each
 * registered adapter as a tool. Deliberately avoids `PluginInput.$` (Bun's
 * injected shell) so this file stays testable under this repo's normal
 * Vitest/Node setup.
 */
export const LenserFightPlugin: Plugin = async () => {
  registerCliBridgeTools()

  const tool: NonNullable<Hooks['tool']> = {}
  for (const id of listOpencodeToolAdapters()) {
    tool[id] = getOpencodeToolAdapter(id).toToolDefinition()
  }
  return { tool }
}

export default LenserFightPlugin
