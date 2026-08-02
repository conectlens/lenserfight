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
 * apps/cli/src/lib/opencode-tool-bridge.ts) — read lazily, at plugin-load
 * time, since the manifest is generated per-project by `lf opencode`, not
 * known when this plugin bundle itself was built.
 *
 * Manifest path travels via LF_OPENCODE_MANIFEST_PATH (set by `lf opencode`
 * on the spawned opencode process's env), not `opencode.json`'s `[path,
 * PluginOptions]` tuple form — that mechanism didn't reliably reach this
 * function when loaded by the real (Bun-based) opencode binary, despite
 * working under plain Node, so env var is the one battle-tested transport
 * both ends of this bridge fully control. */
function registerCliBridgeTools(): void {
  const manifestPath = process.env['LF_OPENCODE_MANIFEST_PATH']
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
 * The OpenCode plugin entrypoint — referenced by path from `opencode.json`'s
 * `plugin` array (see `lf opencode`, `apps/cli/src/commands/opencode.ts`).
 * Walks the adapter registry and exposes each registered adapter as an
 * OpenCode tool. Deliberately avoids `PluginInput.$` (Bun's injected shell)
 * so this file stays testable under this repo's normal Vitest/Node setup.
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
