import type { Hooks, Plugin } from '@opencode-ai/plugin'

import { createBattleCreateAdapter } from './battle-adapter'
import { createLensRunAdapter } from './lens-adapter'
import {
  getOpencodeToolAdapter,
  listOpencodeToolAdapters,
  registerOpencodeToolAdapter,
} from './opencode.registry'

registerOpencodeToolAdapter('lf_lens_run', createLensRunAdapter)
registerOpencodeToolAdapter('lf_battle_create', createBattleCreateAdapter)

/**
 * The OpenCode plugin entrypoint — referenced by path from `opencode.json`'s
 * `plugin` array (see `lf opencode`, `apps/cli/src/commands/opencode.ts`).
 * Walks the adapter registry and exposes each registered adapter as an
 * OpenCode tool. Deliberately avoids `PluginInput.$` (Bun's injected shell)
 * so this file stays testable under this repo's normal Vitest/Node setup.
 */
export const LenserFightPlugin: Plugin = async () => {
  const tool: NonNullable<Hooks['tool']> = {}
  for (const id of listOpencodeToolAdapters()) {
    tool[id] = getOpencodeToolAdapter(id).toToolDefinition()
  }
  return { tool }
}

export default LenserFightPlugin
