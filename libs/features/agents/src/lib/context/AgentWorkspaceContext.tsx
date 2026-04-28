import React, { createContext, useContext } from 'react'

import type {
  AgentProfileView,
  WorkflowRecord,
} from '@lenserfight/data/repositories'
import type {
  AgentWorkspaceBootstrap,
  LenserProfileDTO,
  WorkflowScheduleRecord,
} from '@lenserfight/types'

export type AgentViewMode =
  | 'agent_owner'
  | 'agent_public'
  | 'human_owner'
  | 'human_public'

export interface AgentWorkspaceContextValue {
  viewMode: AgentViewMode
  profile: LenserProfileDTO
  isOwner: boolean
  agentProfile: AgentProfileView | null
  bootstrap: AgentWorkspaceBootstrap | null
  schedules: WorkflowScheduleRecord[]
  workflows: WorkflowRecord[]
  ownedAgents: AgentProfileView[]
  ownedAgentsLoading: boolean
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
