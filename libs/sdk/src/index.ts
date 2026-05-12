// @lenserfight/sdk — public client SDK (alpha)

export { createClient, createClientFromRpc, LenserFightClient } from './lib/lenserfight-client'
export { BattleClient } from './lib/battle-client'
export { TemplateClient } from './lib/template-client'
export { createFetchRpcClient } from './lib/client'
export type { SupabaseLikeRpcClient } from './lib/client'
export type {
  BattleLifecycleStatus,
  BrowseFilters,
  BrowseCursor,
  BrowseBattle,
  BattleTemplate,
  CreateClientOptions,
} from './lib/types'

export const SDK_VERSION = '0.1.0-alpha.1'
