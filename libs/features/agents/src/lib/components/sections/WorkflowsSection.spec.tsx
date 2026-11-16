import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

const { mockUseAgentWorkspace, mockListWorkflowAssignments, mockUseTeamRunDispatch } = vi.hoisted(() => ({
  mockUseAgentWorkspace: vi.fn(),
  mockListWorkflowAssignments: vi.fn(),
  mockUseTeamRunDispatch: vi.fn(),
}))

vi.mock('../../context/AgentWorkspaceContext', () => ({
  useAgentWorkspace: () => mockUseAgentWorkspace(),
}))

vi.mock('@lenserfight/data/cache', () => ({
  queryKeys: {
    agents: {
      workflowAssignments: (id: string) => ['agents', 'workflow-assignments', id],
      workspaceBootstrap: (handle: string) => ['agents', 'bootstrap', handle],
    },
  },
}))

vi.mock('@lenserfight/data/repositories', () => ({
  agentWorkspaceService: {
    listWorkflowAssignments: (...args: unknown[]) => mockListWorkflowAssignments(...args),
    deleteWorkflowAssignment: vi.fn(),
  },
}))

vi.mock('../../hooks/useTeamRunDispatch', () => ({
  useTeamRunDispatch: () => mockUseTeamRunDispatch(),
}))

vi.mock('../drawers/WorkflowAssignmentDrawer', () => ({
  WorkflowAssignmentDrawer: () => null,
}))

vi.mock('@lenserfight/ui/overlays', () => ({
  AlertDialog: () => null,
}))

vi.mock('@lenserfight/ui/components', () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}))

vi.mock('./SectionPage', () => ({
  SectionPage: ({ children, title, toolbar }: any) => (
    <div>
      <h1>{title}</h1>
      {toolbar}
      {children}
    </div>
  ),
}))

vi.mock('../EmptyPanel', () => ({
  EmptyPanel: ({ title, children }: any) => (
    <div>
      <p>{title}</p>
      {children}
    </div>
  ),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

import { WorkflowsSection } from './WorkflowsSection'

const WORKFLOW_A = {
  id: 'wf-1',
  title: 'Research digest',
  description: 'Summarize weekly arena results',
  visibility: 'private',
  parent_workflow_id: null,
  node_count: 4,
  updated_at: '2026-03-01T00:00:00.000Z',
}
const WORKFLOW_B = {
  id: 'wf-2',
  title: 'Battle recap',
  description: 'Post-battle summary',
  visibility: 'private',
  parent_workflow_id: null,
  node_count: 2,
  updated_at: '2026-03-02T00:00:00.000Z',
}

const ASSIGNMENT = {
  id: 'assign-1',
  workflow_id: 'wf-1',
  assignee_kind: 'agent',
  is_active: true,
  approval_policy: {},
}

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <WorkflowsSection />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('WorkflowsSection — library density', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseTeamRunDispatch.mockReturnValue({ dispatch: vi.fn(), isPending: false })
    mockListWorkflowAssignments.mockResolvedValue([])
    mockUseAgentWorkspace.mockReturnValue({
      workflows: [WORKFLOW_A, WORKFLOW_B],
      schedules: [],
      profile: { handle: 'lenso' },
      viewMode: 'agent_owner',
      bootstrap: { ai_lenser_id: 'ai-1', teams: [] },
      activeTeamId: null,
    })
  })

  it('renders multiple workflow cards inside a responsive grid container', () => {
    const { container } = renderSection()

    const grid = container.querySelector('.grid')
    expect(grid).toBeTruthy()
    expect(grid?.className).toContain('md:grid-cols-2')
    expect(grid?.className).toContain('xl:grid-cols-3')
    expect(grid?.children.length).toBe(2)
  })

  it('shows a compact inline meta row instead of a 4-box summary grid', () => {
    renderSection()

    expect(screen.getByText('4 nodes')).toBeTruthy()
    expect(screen.getByText('2 nodes')).toBeTruthy()
    expect(screen.getAllByText('0 assignments').length).toBeGreaterThan(0)
    expect(screen.getAllByText('0 schedules').length).toBeGreaterThan(0)
  })

  it('hides assignments behind a disclosure until expanded', async () => {
    mockListWorkflowAssignments.mockResolvedValue([ASSIGNMENT])
    const { container } = renderSection()

    const summary = await screen.findByText('View 1 assignment')
    const details = summary.closest('details')
    expect(details?.hasAttribute('open')).toBe(false)

    fireEvent.click(summary)

    expect(container.querySelector('details[open]')).toBeTruthy()
    expect(screen.getByText('agent')).toBeTruthy()
  })
})
