import { useLenser, useLenserWorkspace } from '@lenserfight/features/profile'
import { AlertTriangle, Bot } from 'lucide-react'
import React, { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  AgentWorkspaceProvider,
  type AgentViewMode,
} from '../context/AgentWorkspaceContext'
import { useAgentWorkspaceData } from '../hooks/useAgentWorkspaceData'

import { defaultSection, isVisibleSection, type AgentSection } from './agentNavConfig'
import { EmptyPanel } from './EmptyPanel'
import { SectionErrorBoundary } from './SectionErrorBoundary'
import {
  AgentTeamSection,
  ApprovalsSection,
  CostSection,
  EvaluationsSection,
  LogsSection,
  MemorySection,
  ModelsSection,
  OverviewSection,
  PersonalitySection,
  ProvidersSection,
  RunsSection,
  SchedulesSection,
  ScratchpadSection,
  SectionPage,
  SettingsSection,
  ToolsSection,
  WorkflowsSection,
} from './sections'

import type { LenserProfileDTO } from '@lenserfight/types'

const VALID_SECTIONS: AgentSection[] = [
  'overview',
  'scratchpad',
  'team',
  'runs',
  'logs',
  'workflows',
  'schedules',
  'evaluations',
  'memory',
  'personality',
  'tools',
  'models',
  'providers',
  'approvals',
  'cost',
  'settings',
]

const SECTION_COMPONENT: Record<AgentSection, React.ComponentType> = {
  overview: OverviewSection,
  scratchpad: ScratchpadSection,
  team: AgentTeamSection,
  runs: RunsSection,
  logs: LogsSection,
  workflows: WorkflowsSection,
  schedules: SchedulesSection,
  evaluations: EvaluationsSection,
  memory: MemorySection,
  personality: PersonalitySection,
  tools: ToolsSection,
  models: ModelsSection,
  providers: ProvidersSection,
  approvals: ApprovalsSection,
  cost: CostSection,
  settings: SettingsSection,
}

interface AgentWorkspaceShellProps {
  viewMode: AgentViewMode
  profile: LenserProfileDTO
}

export const AgentWorkspaceShell: React.FC<AgentWorkspaceShellProps> = ({
  viewMode,
  profile,
}) => {
  const { section } = useParams<{ section?: string }>()
  const navigate = useNavigate()
  const { lenser: activeWorkspace } = useLenser()
  const { workspaces, switchWorkspace, isSwitching } = useLenserWorkspace()

  const isOwner = useMemo(
    () => workspaces.some((w) => w.id === profile.id),
    [workspaces, profile.id]
  )

  const shouldSwitchWorkspace =
    viewMode === 'agent_owner' && activeWorkspace?.id !== profile.id

  const data = useAgentWorkspaceData({
    handle: profile.handle,
    viewedProfileId: profile.id,
    viewedProfileType: profile.type as 'human' | 'ai',
    isOwner,
    shouldSwitchWorkspace,
  })

  const requestedSection = (section ?? '') as AgentSection
  const isKnown = VALID_SECTIONS.includes(requestedSection)
  const isVisible = isKnown && isVisibleSection(requestedSection, viewMode)
  const activeSection: AgentSection = isVisible
    ? requestedSection
    : defaultSection(viewMode)

  if (shouldSwitchWorkspace) {
    return (
      <SectionPage
        eyebrow="Switch workspace"
        title="Activate this agent workspace first"
        description="The control room is owner-only and runs against the currently active workspace. Switch into this AI lenser before managing teams, schedules, or memory."
      >
        <EmptyPanel
          icon={<Bot size={22} />}
          title={`Switch into @${profile.handle}`}
          description="Once this AI workspace is active, the sidebar and route tree will flip into agent-mode and expose the full control-room navigation."
        >
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => switchWorkspace(profile.id)}
              disabled={isSwitching}
              className="rounded-2xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
            >
              {isSwitching ? 'Switching…' : 'Switch workspace'}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/lenser/${profile.handle}`)}
              className="rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
            >
              Back to profile
            </button>
          </div>
        </EmptyPanel>
      </SectionPage>
    )
  }

  if (data.bootstrapError && viewMode === 'agent_owner') {
    return (
      <SectionPage
        eyebrow="Agent workspace"
        title={`@${profile.handle}`}
        description="Workspace bootstrap failed."
      >
        <div className="rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Workspace bootstrap failed</p>
              <p className="mt-1">
                The control-room RPC did not return bootstrap data. Review the
                migration, RLS, and ownership helpers before relying on this
                workspace in production.
              </p>
            </div>
          </div>
        </div>
      </SectionPage>
    )
  }

  const SectionComponent = SECTION_COMPONENT[activeSection]

  return (
    <AgentWorkspaceProvider
      viewMode={viewMode}
      profile={profile}
      isOwner={isOwner}
      agentProfile={data.agentProfile}
      bootstrap={data.bootstrap}
      schedules={data.schedules}
      workflows={data.workflows}
      ownedAgents={data.ownedAgents}
      ownedAgentsLoading={data.ownedAgentsLoading}
      isLoading={
        data.agentLoading || data.bootstrapLoading || data.ownedAgentsLoading
      }
      shouldSwitchWorkspace={shouldSwitchWorkspace}
      switchWorkspace={() => switchWorkspace(profile.id)}
      isSwitching={isSwitching}
    >
      <SectionErrorBoundary sectionName={activeSection}>
        <SectionComponent />
      </SectionErrorBoundary>
    </AgentWorkspaceProvider>
  )
}
