// ── Types ────────────────────────────────────────────────────────────────────
export * from './lib/types/battle.types'
export * from './lib/types/battle-execution.types'
export * from './lib/types/battle-renderer.types'

// ── Hooks — query (read-only data fetching) ──────────────────────────────────
export * from './lib/hooks/query/useBattle'
export * from './lib/hooks/query/useBattleContenders'
export * from './lib/hooks/query/useBattleScorecard'
export * from './lib/hooks/query/useBattlesFeed'
export * from './lib/hooks/query/useLensAssignment'
export * from './lib/hooks/query/useMyVote'
export * from './lib/hooks/query/useVoteAggregates'
export * from './lib/hooks/query/useVoterEligibility'
export * from './lib/hooks/query/useTrendingBattles'
export * from './lib/hooks/query/useModerationDecisions'
export * from './lib/hooks/query/useBattleReplayEvents'

// ── Hooks — mutations (write / action) ───────────────────────────────────────
export * from './lib/hooks/mutations/useAssignLens'
export * from './lib/hooks/mutations/useInviteContender'
export * from './lib/hooks/mutations/usePublishBattle'
export * from './lib/hooks/mutations/useSubmitEntry'
export * from './lib/hooks/mutations/useSubmitVote'
export * from './lib/hooks/mutations/useWorkflowSubmission'
export * from './lib/hooks/mutations/useOverrideModerationDecision'
export * from './lib/hooks/mutations/useCreateRematch'

// ── Hooks — realtime (Supabase subscriptions) ────────────────────────────────
export * from './lib/hooks/realtime/useBattleCliStream'
export * from './lib/hooks/realtime/useBattleComments'
export * from './lib/hooks/realtime/useBattleLiveSubmission'
export * from './lib/hooks/realtime/useBattleStateSync'
export * from './lib/hooks/realtime/useLenserChat'

// ── Hooks — execution (AI stream orchestration) ──────────────────────────────
export * from './lib/hooks/execution/useBattleExecution'
export * from './lib/hooks/execution/useBattleStream'

// ── Hooks — utils (pure stateless utilities) ─────────────────────────────────
export * from './lib/hooks/utils/useBattleStateMachine'
export * from './lib/hooks/utils/useCountdown'
export * from './lib/hooks/utils/useReplayController'

// ── Renderers ────────────────────────────────────────────────────────────────
export * from './lib/renderers'

// ── Replay strategies ────────────────────────────────────────────────────────
export * from './lib/replay/ReplayStrategy'

// ── Components — arena (layout shell and sub-zones) ──────────────────────────
export * from './lib/components/arena/ArenaView'
export * from './lib/components/arena/ArenaCenterZone'
export * from './lib/components/arena/ArenaContenderColumn'
export * from './lib/components/arena/ArenaTopBar'
export * from './lib/components/arena/FightView'
export * from './lib/components/arena/ImmersiveArenaView'
export * from './lib/components/arena/BattleLiveArena'
export * from './lib/components/arena/LiveArenaTopBar'

// ── Components — admin ───────────────────────────────────────────────────────
export * from './lib/components/TemplateManagementPanel'

// ── Components — spectator (live public battles widget) ──────────────────────
export * from './lib/components/SpectatorFeedWidget'

// ── Components — arena discovery widgets ─────────────────────────────────────
export * from './lib/components/ArenaTrendingBattlesWidget'

// ── Components — replay (chronological event timeline) ───────────────────────
export * from './lib/components/replay/BattleReplayTimeline'

// ── Components — creation (wizard flow and steps) ────────────────────────────
export * from './lib/components/creation/CreateBattleWizard'
export * from './lib/components/creation/BattleTypeSelector'
export * from './lib/components/creation/ContenderInviteStep'
export * from './lib/components/creation/HandicapConfigPanel'
export * from './lib/components/creation/LensAssignmentStep'
export * from './lib/components/creation/LenserSearchPicker'
export * from './lib/components/creation/VoterEligibilitySelector'
export * from './lib/components/creation/BattleRulesDrawer'

// ── Components — display (presentational cards, badges, indicators) ───────────
export * from './lib/components/display/BattleCard'
export * from './lib/components/display/LiveBattleCard'
export * from './lib/components/display/HotBattleCard'
export * from './lib/components/display/BattleStatusBadge'
export * from './lib/components/display/BattleSEOHead'
export * from './lib/components/display/BattleShareCard'
export * from './lib/components/display/BattleCreatorPanel'
export * from './lib/components/display/PhaseIndicator'
export * from './lib/components/display/TrueSkillBadge'
export * from './lib/components/display/XPGainToast'

// ── Components — scoring (vote, rubric, result, score) ───────────────────────
export * from './lib/components/scoring/VotePanel'
export * from './lib/components/scoring/RubricPanel'
export * from './lib/components/scoring/ResultBanner'
export * from './lib/components/scoring/ScoreSystem'

// ── Components — submission (forms and viewers) ───────────────────────────────
export * from './lib/components/submission/ContenderSlot'
export * from './lib/components/submission/SubmissionViewer'
export * from './lib/components/submission/SubmitTextForm'
export * from './lib/components/submission/SubmitWorkflowForm'
export * from './lib/components/submission/WorkflowSubmissionViewer'

// ── Components — stream (live streaming and replay) ───────────────────────────
export * from './lib/components/stream/StreamingOutput'
export * from './lib/components/stream/StreamStatusBar'
export * from './lib/components/stream/ReplayControls'

// ── Components — chat (messaging panels) ─────────────────────────────────────
export * from './lib/components/chat/BattleChatPanel'
export * from './lib/components/chat/LenserChatRail'
export * from './lib/components/chat/ChatMessage'

// ── Pages ────────────────────────────────────────────────────────────────────
export * from './lib/pages/BattlesFeedPage'
export * from './lib/pages/BattleDetailPage'
export * from './lib/pages/BattleResultPage'
export * from './lib/pages/BattleReplayPage'
export * from './lib/pages/BattleLenserboardPage'
export * from './lib/pages/TournamentPage'
export * from './lib/pages/AdminDashboardPage'
export * from './lib/pages/AdminBattlesPanelPage'
export * from './lib/pages/ArenaBattlesDiscoveryPage'
export * from './lib/components/tournament/TournamentCard'
export * from './lib/components/tournament/TournamentBracket'
