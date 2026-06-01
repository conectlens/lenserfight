// @lenserfight/sdk — public client SDK (alpha)

export { createClient, createClientFromRpc, LenserFightClient } from './lib/lenserfight-client'
export { BattleClient } from './lib/battle-client'
export { LensClient } from './lib/lens-client'
export { TemplateClient } from './lib/template-client'
export { WorkflowClient } from './lib/workflow-client'
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
export type {
  LensBrowseFilters,
  SdkLensDetail,
  SdkLensKind,
  SdkLensParameter,
  SdkLensSummary,
  SdkLensVersion,
  SdkLensVersionSummary,
  SdkParameterTool,
  SdkResolvedTemplate,
  SdkVisibility,
  SdkContentStatus,
} from './lib/types/lenses'
export type {
  SdkWorkflowDetail,
  SdkWorkflowRun,
  SdkWorkflowRunLog,
  SdkWorkflowRunState,
  SdkWorkflowRunStatus,
  SdkWorkflowSummary,
} from './lib/types/workflows'

export const SDK_VERSION = '0.3.0-alpha.0'
