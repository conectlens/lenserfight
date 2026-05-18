export { TeamRunStatusBadge } from './lib/components/TeamRunStatusBadge'
export type { TeamRunStatusBadgeProps } from './lib/components/TeamRunStatusBadge'
export { AgentSettingsSheet } from './lib/components/AgentSettingsSheet'
export { AgentCard } from './lib/components/AgentCard'
export { AgentStatusBadge } from './lib/components/AgentStatusBadge'
export { AgentQuotaBar } from './lib/components/AgentQuotaBar'
export { AgentPolicySummary } from './lib/components/AgentPolicySummary'
export { AgentManageWizard } from './lib/components/AgentManageWizard'
export { AgentProfileRedirect } from './lib/components/AgentProfileRedirect'
export { AgentPersonalityStep } from './lib/components/AgentPersonalityStep'
export { AgentWorkspacePage } from './lib/pages/AgentWorkspacePage'
export { AgentRouteShell } from './lib/components/AgentRouteShell'
export { AgentWorkspaceShell } from './lib/components/AgentWorkspaceShell'
export { NAV_ITEMS, ZONE_LABELS, AGENT_NAV_ZONES } from './lib/components/agentNavConfig'
export type { AgentSection, AgentNavItem, AgentNavZone } from './lib/components/agentNavConfig'
export { AgentsGrid } from './lib/components/AgentsGrid'
export { EmptyPanel as AgentEmptyPanel } from './lib/components/EmptyPanel'
export { ApprovalDecisionDialog } from './lib/components/ApprovalDecisionDialog'
export { CrossAgentActivityFeed } from './lib/components/CrossAgentActivityFeed'
export { SectionErrorBoundary } from './lib/components/SectionErrorBoundary'

// Sections (composable per-route renderers used by AgentWorkspaceShell)
export {
  AgentTeamSection,
  AnalyticsSection,
  ApprovalQueueSection,
  ApprovalsSection,
  CostMonitorSection,
  CostSection,
  EvaluationsSection,
  LogsSection,
  MemorySection,
  ModelsSection,
  OverviewSection,
  InstructionsSection,
  ProvidersSection,
  ReportsSection,
  RunsSection,
  SchedulesSection,
  ScratchpadSection,
  SectionPage,
  SettingsSection,
  ToolsSection,
  WorkflowsSection,
} from './lib/components/sections'

// CRUD drawers
export { CreateTeamDrawer } from './lib/components/drawers/CreateTeamDrawer'
export { AddTeamMemberDrawer } from './lib/components/drawers/AddTeamMemberDrawer'
export { TeamEdgesDrawer } from './lib/components/drawers/TeamEdgesDrawer'
export { BindModelDrawer } from './lib/components/drawers/BindModelDrawer'
export { ConfigureProviderDrawer } from './lib/components/drawers/ConfigureProviderDrawer'
export type { ProviderInfo } from './lib/components/drawers/ConfigureProviderDrawer'
export { MemoryProfileDrawer } from './lib/components/drawers/MemoryProfileDrawer'
export { LensBindingPicker } from './lib/components/LensBindingPicker'
export { ToolProfileDrawer } from './lib/components/drawers/ToolProfileDrawer'
export { RegisterToolDrawer } from './lib/components/drawers/RegisterToolDrawer'
export { AssignToolDrawer } from './lib/components/drawers/AssignToolDrawer'
export { ScheduleDrawer } from './lib/components/drawers/ScheduleDrawer'
export { EvaluationDrawer } from './lib/components/drawers/EvaluationDrawer'

// Context
export {
  AgentWorkspaceProvider,
  useAgentWorkspace,
  useAgentWorkspaceOptional,
} from './lib/context/AgentWorkspaceContext'
export type {
  AgentViewMode,
  AgentWorkspaceContextValue,
} from './lib/context/AgentWorkspaceContext'

// Hooks
export { useAgents } from './lib/hooks/useAgents'
export { useAgentDetail } from './lib/hooks/useAgentDetail'
export { useAgentAutomationFeed } from './lib/hooks/useAgentAutomationFeed'
export { useCreateAgent } from './lib/hooks/useCreateAgent'
export { useHandleCheck } from './lib/hooks/useHandleCheck'
export { useAgentPersonality } from './lib/hooks/useAgentPersonality'
export { useAgentLensPicker } from './lib/hooks/useAgentLensPicker'
export type { PickableLens } from './lib/hooks/useAgentLensPicker'
export { useAgentRouteMode } from './lib/hooks/useAgentRouteMode'
export type { AgentRouteMode } from './lib/hooks/useAgentRouteMode'
export { useAgentWorkspaceData } from './lib/hooks/useAgentWorkspaceData'
// Phase 8: Autonomous Agent OS hooks
export { useRunReports, useRunReport, useRunIncidents } from './lib/hooks/useRunReports'
export { usePolicyLog } from './lib/hooks/usePolicyLog'
export { useRunUnified } from './lib/hooks/useRunUnified'
export { useWorkspaceControls } from './lib/hooks/useWorkspaceControls'
