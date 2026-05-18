import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { vi } from 'vitest'

const {
  mockUseAgentWorkspace,
  mockDeleteSchedule,
  mockUpsertSchedule,
  mockGetScheduleHistory,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockUseAgentWorkspace: vi.fn(),
  mockDeleteSchedule: vi.fn(),
  mockUpsertSchedule: vi.fn(),
  mockGetScheduleHistory: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}))

vi.mock('../../context/AgentWorkspaceContext', () => ({
  useAgentWorkspace: () => mockUseAgentWorkspace(),
}))

vi.mock('@lenserfight/data/repositories', () => ({
  workflowsService: {
    deleteSchedule: (...args: unknown[]) => mockDeleteSchedule(...args),
    upsertSchedule: (...args: unknown[]) => mockUpsertSchedule(...args),
    getScheduleHistory: (...args: unknown[]) => mockGetScheduleHistory(...args),
  },
}))

vi.mock('../drawers/ScheduleRunHistoryDrawer', () => ({
  ScheduleRunHistoryDrawer: ({
    open,
    scheduleName,
  }: {
    open: boolean
    onClose: () => void
    scheduleId: string | null
    scheduleName: string
  }) =>
    open ? <div data-testid="history-drawer">{scheduleName}</div> : null,
}))

vi.mock('@lenserfight/ui/overlays', () => ({
  AlertDialog: ({
    open,
    title,
    bodyText,
    confirmAction,
  }: {
    open: boolean
    title: string
    bodyText?: string
    confirmAction: { label: string; onClick: () => void }
  }) =>
    open ? (
      <div>
        <p>{title}</p>
        <p>{bodyText}</p>
        <Button type="button" onClick={confirmAction.onClick}>
          {confirmAction.label}
        </Button>
      </div>
    ) : null,
}))

vi.mock('../drawers/ScheduleDrawer', () => ({
  ScheduleDrawer: () => null,
}))

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

import { SchedulesSection } from './SchedulesSection'

import type { AgentWorkspaceContextValue } from '../../context/AgentWorkspaceContext'
import type { WorkflowRecord } from '@lenserfight/data/repositories'
import type { WorkflowScheduleRecord } from '@lenserfight/types'
import { Button } from '@lenserfight/ui/components'


function makeWorkflow(overrides: Partial<WorkflowRecord> = {}): WorkflowRecord {
  return {
    id: 'workflow-1',
    lenser_id: 'human-1',
    title: 'Nightly research',
    description: null,
    visibility: 'private',
    battle_count: 0,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeSchedule(overrides: Partial<WorkflowScheduleRecord> = {}): WorkflowScheduleRecord {
  return {
    id: 'schedule-1',
    workflow_id: 'workflow-1',
    workflow_title: 'Nightly research',
    cron_expr: '0 9 * * 1',
    timezone: 'UTC',
    global_model_id: null,
    inputs_template: {},
    is_active: true,
    assignee_type: 'agent',
    assignee_id: 'ai-1',
    workflow_assignment_id: null,
    approval_policy: {},
    retry_policy: {},
    failure_policy: {},
    queue_policy: {},
    next_run_at: '2026-05-01T09:00:00.000Z',
    last_run_at: null,
    last_run_id: null,
    last_dispatch_status: null,
    last_error_at: null,
    last_error_message: null,
    last_completed_at: null,
    last_result: {},
    created_at: '2026-05-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeContext(
  overrides: Partial<AgentWorkspaceContextValue> = {}
): AgentWorkspaceContextValue {
  return {
    viewMode: 'agent_owner',
    profile: {
      id: 'profile-1',
      handle: 'owner-bot',
      display_name: 'Owner Bot',
      avatar_url: null,
      bio: null,
      interests: [],
      visibility: 'public',
      type: 'ai',
      owner_user_id: null,
      created_at: '2026-05-01T00:00:00.000Z',
      updated_at: '2026-05-01T00:00:00.000Z',
    },
    isOwner: true,
    agentProfile: null,
    bootstrap: {
      profile_id: 'profile-1',
      ai_lenser_id: 'ai-1',
      teams: [],
      runs: [],
      profiles: {
        personality: [],
        memory: [],
        tools: [],
        models: [],
      },
      workflow_assignments: [],
    },
    bootstrapState: { kind: 'ready' },
    schedules: [],
    workflows: [makeWorkflow()],
    ownerFleetAgents: [],
    ownerFleetAgentsLoading: false,
    activeTeamId: null,
    instructionBindings: [],
    modelBindings: [],
    defaultInstructionBinding: null,
    isLoading: false,
    shouldSwitchWorkspace: false,
    switchWorkspace: vi.fn(),
    isSwitching: false,
    ...overrides,
  }
}

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <SchedulesSection />
    </QueryClientProvider>
  )
}

describe('SchedulesSection', () => {
  beforeEach(() => {
    mockUseAgentWorkspace.mockReset()
    mockDeleteSchedule.mockReset()
    mockUpsertSchedule.mockReset()
    mockGetScheduleHistory.mockReset()
    mockToastSuccess.mockReset()
    mockToastError.mockReset()
    mockDeleteSchedule.mockResolvedValue(undefined)
    mockUpsertSchedule.mockResolvedValue(makeSchedule())
    mockGetScheduleHistory.mockResolvedValue([])
  })

  it('shows the owner empty state and blocks creation when no workflows exist', () => {
    mockUseAgentWorkspace.mockReturnValue(
      makeContext({
        schedules: [],
        workflows: [],
      })
    )

    renderSection()

    expect(screen.getByText('No schedules yet')).toBeTruthy()
    expect(
      (
        screen.getByRole('button', {
          name: 'Create a workflow first',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true)
  })

  it('renders paused schedules with owner controls', () => {
    mockUseAgentWorkspace.mockReturnValue(
      makeContext({
        schedules: [
          makeSchedule({
            is_active: false,
            last_dispatch_status: 'dispatch_failed',
          }),
        ],
      })
    )

    renderSection()

    expect(screen.getByText('Nightly research')).toBeTruthy()
    expect(screen.getByText('Paused')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Resume' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy()
  })

  it('hides management controls for public viewers', () => {
    mockUseAgentWorkspace.mockReturnValue(
      makeContext({
        viewMode: 'agent_public',
        isOwner: false,
        schedules: [makeSchedule()],
      })
    )

    renderSection()

    expect(screen.queryByRole('button', { name: 'New schedule' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
  })

  it('confirms schedule deletion through the destructive dialog', async () => {
    mockUseAgentWorkspace.mockReturnValue(
      makeContext({
        schedules: [makeSchedule()],
      })
    )

    renderSection()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByText('Delete schedule?')).toBeTruthy()

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[1])

    await waitFor(() => {
      expect(mockDeleteSchedule).toHaveBeenCalledWith('schedule-1')
    })
  })

  it('opens the run history drawer when the history button is clicked', () => {
    mockUseAgentWorkspace.mockReturnValue(
      makeContext({
        schedules: [makeSchedule()],
      })
    )

    renderSection()

    expect(screen.queryByTestId('history-drawer')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'View run history' }))

    expect(screen.getByTestId('history-drawer')).toBeTruthy()
    expect(screen.getAllByText('Nightly research').length).toBeGreaterThanOrEqual(2)
  })
})
