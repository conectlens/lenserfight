export type { ScoringPluginV1, SubmissionView, ScoringSuccess, ScoringFailure, ScoringResult } from './lib/scoring-plugin'
export {
  registerScoringPlugin,
  getScoringPlugin,
  listScoringPlugins,
  unregisterScoringPlugin,
  __resetScoringRegistryForTests,
} from './lib/scoring-plugin.registry'
