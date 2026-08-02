export type { OpencodeToolAdapter, OpencodeToolAdapterV1, OpencodeToolMetadata } from './lib/opencode-tool-adapter'

export {
  registerOpencodeToolAdapter,
  unregisterOpencodeToolAdapter,
  getOpencodeToolAdapter,
  listOpencodeToolAdapters,
  __resetOpencodeRegistryForTests,
} from './lib/opencode.registry'

export { LenserFightPlugin } from './lib/lf-plugin'
export { createLensRunAdapter } from './lib/lens-adapter'
export { createBattleCreateAdapter } from './lib/battle-adapter'
export { createCliBridgeAdapter } from './lib/cli-bridge-adapter'
export type { CliToolArgSpec, CliToolManifest, CliToolManifestEntry } from './lib/cli-bridge-adapter'
