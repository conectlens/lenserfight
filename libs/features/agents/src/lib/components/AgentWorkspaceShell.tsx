import { useLenserWorkspace, useWorkspaceSwitchController } from '@lenserfight/features/profile'
import { Alert } from '@lenserfight/ui/components'
import { Bot } from 'lucide-react'
import React from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import {
  AgentWorkspaceProvider,
  type AgentViewMode,
} from '../context/AgentWorkspaceContext'
import { useAgentWorkspaceData } from '../hooks/useAgentWorkspaceData'

import {
  defaultSection,
  isVisibleSection,
  LEGACY_AGENT_SECTION_ALIASES,
  type AgentSection,
} from './agentNavConfig'
import { EmptyPanel } from './EmptyPanel'
import { SectionErrorBoundary } from './SectionErrorBoundary'
import {
  AgentTeamSection,
  AnalyticsSection,
  ApprovalsSection,
  BattlesSection,
  CostSection,
  EvaluationsSection,
  LogsSection,
  MemorySection,
  ModelsSection,
  ByokSection,
  OverviewSection,
  InstructionsSection,
  PersonalitySection,
  ProvidersSection,
  ReportsSection,
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
  'reports',
  'team',
  'runs',
  'logs',
  'workflows',
  'schedules',
  'evaluations',
  'memory',
  'instructions',
  'personality',
  'tools',
  'models',
  'providers',
  'byok',
  'approvals',
  'cost',
  'analytics',
  'settings',
  'battles',
]

function getSectionComponent(section: AgentSection): React.ComponentType {
  switch (section) {
    case 'overview': return OverviewSection
    case 'scratchpad': return ScratchpadSection
    case 'reports': return ReportsSection
    case 'team': return AgentTeamSection
    case 'runs': return RunsSection
    case 'logs': return LogsSection
    case 'workflows': return WorkflowsSection
    case 'schedules': return SchedulesSection
    case 'evaluations': return EvaluationsSection
    case 'memory': return MemorySection
    case 'instructions': return InstructionsSection
    case 'personality': return PersonalitySection
    case 'tools': return ToolsSection
    case 'models': return ModelsSection
    case 'providers': return ProvidersSection
    case 'byok': return ByokSection
    case 'approvals': return ApprovalsSection
    case 'cost': return CostSection
    case 'analytics': return AnalyticsSection
    case 'settings': return SettingsSection
    case 'battles': return BattlesSection
    default: return OverviewSection
  }
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
  const { humanWorkspace, isOwnedWorkspace, activeWorkspace } = useLenserWorkspace()
  const { switchToProfile, isSwitching } = useWorkspaceSwitchController()

  const isOwner = isOwnedWorkspace(profile.id)

  const shouldSwitchWorkspace =
    viewMode === 'agent_owner' && activeWorkspace?.id !== profile.id

  const data = useAgentWorkspaceData({
    handle: profile.handle,
    viewedProfileId: profile.id,
    viewedProfileType: profile.type as 'human' | 'ai',
    isOwner,
    shouldSwitchWorkspace,
    ownerHumanLenserId: humanWorkspace?.id,
  })

  const requestedSection = (LEGACY_AGENT_SECTION_ALIASES[section ?? ''] ??
    section ??
    '') as AgentSection
  const isKnown = VALID_SECTIONS.includes(requestedSection)
  const isVisible = isKnown && isVisibleSection(requestedSection, viewMode)
  const activeSection: AgentSection = isVisible
    ? requestedSection
    : defaultSection(viewMode)

  if (section && LEGACY_AGENT_SECTION_ALIASES[section]) {
    return (
      <Navigate
        to={`/lenser/${profile.handle}/ag/${LEGACY_AGENT_SECTION_ALIASES[section]}`}
        replace
      />
    )
  }

  if (isKnown && !isVisible) {
    return <Navigate replace to={`/lenser/${profile.handle}/ag/overview`} />
  }

  React.useEffect(() => {
    if (shouldSwitchWorkspace && !isSwitching) {
      switchToProfile(profile).catch((err) => {
        console.error('Auto-switch failed', err)
      })
    }
  }, [shouldSwitchWorkspace, isSwitching, switchToProfile, profile])

  if (shouldSwitchWorkspace) {
    return (
      <SectionPage
        eyebrow="Workspace"
        title={`Activating @${profile.handle}`}
        description="Switching context to owner workspace..."
      >
        <div className="flex flex-col gap-6 items-center justify-center h-64">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-yellow-500 border-t-transparent" />
          <p className="text-sm font-medium text-primary-yellow-600 animate-pulse">
            Switching into agent workspace...
          </p>
        </div>
      </SectionPage>
    )
  }

  const isAgentContext = isOwner && profile.type === 'ai'
  if (isAgentContext && (data.agentLoading || data.bootstrapState.kind === 'loading')) {
    return (
      <SectionPage eyebrow="Loading" title={`@${profile.handle}`} description="">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      </SectionPage>
    )
  }

  if (isAgentContext && !data.agentProfile && !data.agentLoading && viewMode === 'agent_owner') {
    return (
      <SectionPage
        eyebrow="Agent workspace"
        title={`@${profile.handle}`}
        description="Agent workspace data not found."
      >
        <Alert variant="warning" title="Agent workspace not initialized">
          No agent profile was found for this workspace. Ensure the AI lenser was created
          through the proper provisioning flow and the agent migrations are applied.
        </Alert>
      </SectionPage>
    )
  }

  if (data.bootstrapState.kind === 'failed' && viewMode === 'agent_owner') {
    return (
      <SectionPage
        eyebrow="Agent workspace"
        title={`@${profile.handle}`}
        description="Workspace bootstrap failed."
      >
        <Alert variant="error" title="Workspace bootstrap failed">
          {data.bootstrapState.message ??
            'The control-room RPC did not return bootstrap data. Review the migration, RLS, and ownership helpers before relying on this workspace in production.'}
        </Alert>
      </SectionPage>
    )
  }

  const SectionComponent = getSectionComponent(activeSection)

  return (
    <AgentWorkspaceProvider
      viewMode={viewMode}
      profile={profile}
      isOwner={isOwner}
      agentProfile={data.agentProfile}
      bootstrap={data.bootstrap}
      bootstrapState={data.bootstrapState}
      schedules={data.schedules}
      workflows={data.workflows}
      ownerFleetAgents={data.ownerFleetAgents}
      ownerFleetAgentsLoading={data.ownerFleetAgentsLoading}
      activeTeamId={
        (data.bootstrap?.teams.find((team) => team.is_active) ?? data.bootstrap?.teams[0])?.id ??
        null
      }
      instructionBindings={data.instructionBindings}
      modelBindings={data.modelBindings}
      defaultInstructionBinding={data.defaultInstructionBinding}
      personalityBindings={data.personalityBindings}
      defaultPersonalityBinding={data.defaultPersonalityBinding}
      isLoading={
        data.agentLoading ||
        data.bootstrapState.kind === 'loading' ||
        data.ownerFleetAgentsLoading
      }
      shouldSwitchWorkspace={shouldSwitchWorkspace}
      switchWorkspace={() => switchToProfile(profile)}
      isSwitching={isSwitching}
    >
      <div className="flex flex-col gap-3">
        <SectionErrorBoundary sectionName={activeSection}>
          <SectionComponent />
        </SectionErrorBoundary>
      </div>
    </AgentWorkspaceProvider>
  )
}
