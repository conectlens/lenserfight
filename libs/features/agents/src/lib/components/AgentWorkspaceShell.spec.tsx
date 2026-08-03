import { render, waitFor } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'

const { mockSwitchToProfile, mockUseLenserWorkspace } = vi.hoisted(() => ({
  mockSwitchToProfile: vi.fn(),
  mockUseLenserWorkspace: vi.fn(),
}))

vi.mock('@lenserfight/features/profile/useLenserWorkspace', () => ({
  useLenserWorkspace: () => mockUseLenserWorkspace(),
}))

vi.mock('@lenserfight/features/profile/useWorkspaceSwitchController', () => ({
  useWorkspaceSwitchController: () => ({
    switchToProfile: mockSwitchToProfile,
    isSwitching: false,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useIsMutating: () => 0,
}))

vi.mock('react-router-dom', () => ({
  Navigate: () => null,
  useNavigate: () => vi.fn(),
  useParams: () => ({ section: 'overview' }),
}))

vi.mock('@lenserfight/ui/components', () => ({
  Alert: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../context/AgentWorkspaceContext', () => ({
  AgentWorkspaceProvider: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../hooks/useAgentWorkspaceData', () => ({
  useAgentWorkspaceData: () => ({
    agentProfile: null,
    agentLoading: false,
    bootstrap: null,
    bootstrapState: { kind: 'ready' },
    schedules: [],
    workflows: [],
    ownerFleetAgents: [],
    ownerFleetAgentsLoading: false,
    instructionBindings: [],
    modelBindings: [],
    defaultInstructionBinding: null,
    personalityBindings: [],
    defaultPersonalityBinding: null,
  }),
}))

vi.mock('./SectionErrorBoundary', () => ({
  SectionErrorBoundary: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('./sections', () => {
  const Stub = () => null
  return {
    SectionPage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    AgentTeamSection: Stub,
    AnalyticsSection: Stub,
    ApprovalsSection: Stub,
    BattlesSection: Stub,
    ByokSection: Stub,
    CostSection: Stub,
    EvaluationsSection: Stub,
    InstructionsSection: Stub,
    LogsSection: Stub,
    MemorySection: Stub,
    ModelsSection: Stub,
    OverviewSection: Stub,
    PersonalitySection: Stub,
    ProvidersSection: Stub,
    ReportsSection: Stub,
    RunsSection: Stub,
    SchedulesSection: Stub,
    ScratchpadSection: Stub,
    SettingsSection: Stub,
    ToolsSection: Stub,
    WorkflowsSection: Stub,
  }
})

import { AgentWorkspaceShell } from './AgentWorkspaceShell'

import type { LenserProfileDTO } from '@lenserfight/types'

const LENSA = { id: 'id-lensa', handle: 'lensa', type: 'ai' } as LenserProfileDTO
const LENSE = { id: 'id-lense', handle: 'lense', type: 'ai' } as LenserProfileDTO

function setLocation(pathname: string) {
  window.history.replaceState({}, '', pathname)
}

beforeEach(() => {
  mockSwitchToProfile.mockReset()
  mockSwitchToProfile.mockResolvedValue(undefined)
  mockUseLenserWorkspace.mockReset()
})

describe('AgentWorkspaceShell auto-switch', () => {
  it('activates the workspace when the URL points at this shell', async () => {
    setLocation('/lenser/lensa/ag/overview')
    mockUseLenserWorkspace.mockReturnValue({
      workspaces: [LENSA, LENSE],
      activeWorkspace: LENSE,
      humanWorkspace: null,
      isOwnedWorkspace: () => true,
      isSwitching: false,
      switchWorkspace: vi.fn(),
    })

    render(<AgentWorkspaceShell viewMode="agent_owner" profile={LENSA} />)

    await waitFor(() => expect(mockSwitchToProfile).toHaveBeenCalledWith(LENSA))
  })

  it('does not switch from a shell the URL has already navigated away from', async () => {
    setLocation('/lenser/lense/ag/overview')
    mockUseLenserWorkspace.mockReturnValue({
      workspaces: [LENSA, LENSE],
      activeWorkspace: LENSE,
      humanWorkspace: null,
      isOwnedWorkspace: () => true,
      isSwitching: false,
      switchWorkspace: vi.fn(),
    })

    render(<AgentWorkspaceShell viewMode="agent_owner" profile={LENSA} />)

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(mockSwitchToProfile).not.toHaveBeenCalled()
  })
})
