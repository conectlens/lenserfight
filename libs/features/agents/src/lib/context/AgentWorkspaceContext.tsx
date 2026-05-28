import React, { createContext, useContext } from 'react'

import type {
  AgentProfileView,
  WorkflowRecord,
} from '@lenserfight/data/repositories'
import type {
  AgentLensBindingRecord,
  AgentModelBindingRecord,
  AgentWorkspaceBootstrap,
  LenserProfileDTO,
  WorkflowScheduleRecord,
} from '@lenserfight/types'

export type AgentViewMode =
  | 'agent_owner'
  | 'agent_public'
  | 'human_owner'
  | 'human_public'

export type AgentWorkspaceBootstrapState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'missing' }
  | { kind: 'failed'; message?: string }

export interface AgentWorkspaceContextValue {
  viewMode: AgentViewMode
  profile: LenserProfileDTO
  isOwner: boolean
  agentProfile: AgentProfileView | null
  bootstrap: AgentWorkspaceBootstrap | null
  bootstrapState: AgentWorkspaceBootstrapState
  schedules: WorkflowScheduleRecord[]
  workflows: WorkflowRecord[]
  ownerFleetAgents: AgentProfileView[]
  ownerFleetAgentsLoading: boolean
  activeTeamId: string | null
  instructionBindings: AgentLensBindingRecord[]
  modelBindings: AgentModelBindingRecord[]
  defaultInstructionBinding: AgentLensBindingRecord | null
  personalityBindings: AgentLensBindingRecord[]
  defaultPersonalityBinding: AgentLensBindingRecord | null
  isLoading: boolean
  shouldSwitchWorkspace: boolean
  switchWorkspace: () => void
  isSwitching: boolean
}

const AgentWorkspaceContext = createContext<AgentWorkspaceContextValue | null>(
  null
)

interface ProviderProps extends AgentWorkspaceContextValue {
  children: React.ReactNode
}

export const AgentWorkspaceProvider: React.FC<ProviderProps> = ({
  children,
  ...value
}) => (
  <AgentWorkspaceContext.Provider value={value}>
    {children}
  </AgentWorkspaceContext.Provider>
)

export function useAgentWorkspace(): AgentWorkspaceContextValue {
  const ctx = useContext(AgentWorkspaceContext)
  if (!ctx) {
    throw new Error(
      'useAgentWorkspace must be used inside AgentWorkspaceProvider'
    )
  }
  return ctx
}

export function useAgentWorkspaceOptional(): AgentWorkspaceContextValue | null {
  return useContext(AgentWorkspaceContext)
}
