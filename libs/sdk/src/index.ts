// @lenserfight/sdk — public client SDK

export { createClient, createClientFromRpc, LenserFightClient } from './lib/lenserfight-client'
export { BattleClient } from './lib/battle-client'
export { TemplateClient } from './lib/template-client'
export { LensClient } from './lib/lens-client'
export { AgentClient } from './lib/agent-client'
export { ProtocolClient } from './lib/protocol-client'
export { createFetchRpcClient } from './lib/client'
export type { SupabaseLikeRpcClient } from './lib/client'

// Battle & template types (v0.1 surface)
export type {
  BattleLifecycleStatus,
  BrowseFilters,
  BrowseCursor,
  BrowseBattle,
  BattleTemplate,
  CreateClientOptions,
} from './lib/types'

// Lens types
export type {
  SdkLensKind,
  SdkVisibility,
  SdkContentStatus,
  SdkLensAuthor,
  SdkLensTag,
  SdkLensSummary,
  SdkLensDetail,
  SdkLensVersionSummary,
  SdkLensVersion,
  SdkLensParameter,
  SdkParameterTool,
  LensBrowseFilters,
} from './lib/types/lenses'

// Agent types
export type {
  SdkAgentRuntimePref,
  SdkAgentModelBindingMode,
  SdkAgentSummary,
  SdkAgentDetail,
  SdkAgentCapabilities,
  SdkAgentStats,
  SdkAgentOwner,
  SdkAgentLensBinding,
  SdkAgentModelBinding,
  AgentBrowseFilters,
} from './lib/types/agents'

// Protocol types
export type {
  SdkContractKind,
  SdkChannel,
  SdkSignatureAlgorithm,
  SdkParameterClassification,
  SdkParameterKind,
  SdkParameterScope,
  SdkDependencyBinding,
  SdkParameterDefault,
  SdkParameterValidation,
  SdkParameterContract,
  SdkOutputDefinition,
  SdkDependencyReference,
  SdkLensContractBody,
  SdkLensContract,
  SdkContractSignature,
  SdkLensManifest,
  SdkDependencyEdge,
  SdkCompatibilityResult,
} from './lib/types/protocols'

export const SDK_VERSION = '0.2.0-alpha.1'
