export { escapeHtml, escapeAttr, serializeJsonLd } from './lib/html'
export { renderBotHtml } from './lib/renderDocument'
export type { SeoDocument, HreflangAlternate, BattleSeoInput, WorkflowSeoInput } from './lib/types'
export { renderEntityBody, FORUM_HOST, ARENA_HOST } from './lib/bodies/shared'
export type { EntityLink, EntityFact, EntityBodyInput } from './lib/bodies/shared'
export {
  renderLensBody,
  renderBattleBody,
  renderLenserBody,
  renderThreadBody,
  renderWorkflowBody,
  renderRayBody,
} from './lib/bodies/entities'
export {
  buildHreflang,
  buildLensDocument,
  buildBattleDocument,
  buildLenserDocument,
  buildWorkflowDocument,
  buildThreadDocument,
  buildRayDocument,
} from './lib/builders'
export type { BuildContext } from './lib/builders'
export { callRpc, makeSeoFetchers } from './lib/fetchers'
export type { SupabaseRestConfig, RpcOptions } from './lib/fetchers'
