import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import type {
  AgentWorkflowAssignmentRecord,
  AgentWorkspaceBootstrap,
  AgentTeamRunRecord,
} from '@lenserfight/types'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@lenserfight/data/repositories', () => ({
  agentWorkspaceService: {
    createTeamRun: vi.fn(),
    updateTeamRunStatus: vi.fn(),
    appendTeamRunEvent: vi.fn(),
    upsertAgentRunStep: vi.fn(),
  },
  lensesService: {
    getVersionById: vi.fn(),
    getLatestPublishedVersion: vi.fn(),
  },
  workflowsService: {
    startRun: vi.fn(),
    getNodes: vi.fn(),
    getEdges: vi.fn(),
    updateNodeResult: vi.fn(),
    appendRunEvent: vi.fn(),
  },
}))

const mockExecuteWorkflow = vi.fn().mockResolvedValue({ status: 'completed', nodeResults: [] })

vi.mock('@lenserfight/infra/execution', () => ({
  WorkflowExecutionService: vi.fn().mockImplementation(function () {
    this.executeWorkflow = mockExecuteWorkflow
  }),
}))

vi.mock('@lenserfight/providers', () => ({
  byokKeyResolver: {
    resolve: vi.fn().mockReturnValue('test-api-key'),
  },
  callProvider: vi.fn().mockResolvedValue({ content: 'result', usage: {} }),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeBootstrap = (overrides: Partial<AgentWorkspaceBootstrap> = {}): AgentWorkspaceBootstrap => ({
  profile_id: 'profile-1',
  ai_lenser_id: 'ai-lenser-1',
  teams: [],
  runs: [],
  profiles: {
    personality: [],
    memory: [],
    tools: [],
    models: [
      {
        id: 'model-1',
        ai_lenser_id: 'ai-lenser-1',
        name: 'Default',
        provider_key: 'anthropic',
        model_id: null,
        model_key: 'claude-3-5-sonnet-20241022',
        support_level: 'runnable',
        params: {},
        is_default: true,
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
      },
    ],
  },
  workflow_assignments: [],
  ...overrides,
})

const makeAssignment = (overrides: Partial<AgentWorkflowAssignmentRecord> = {}): AgentWorkflowAssignmentRecord => ({
  id: 'assignment-1',
  ai_lenser_id: 'ai-lenser-1',
  workflow_id: 'workflow-1',
  assignee_kind: 'agent',
  assignee_ai_lenser_id: 'ai-lenser-1',
  assignee_team_id: null,
  approval_policy: {},
  retry_policy: {},
  failure_policy: {},
  queue_policy: {},
  output_destination: {},
  is_active: true,
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
  ...overrides,
})

const makeTeamRun = (overrides: Partial<AgentTeamRunRecord> = {}): AgentTeamRunRecord => ({
  id: 'team-run-1',
  ai_lenser_id: 'ai-lenser-1',
  team_id: null,
  workflow_id: 'workflow-1',
  workflow_run_id: 'workflow-run-1',
  workflow_assignment_id: 'assignment-1',
  status: 'running',
  approval_status: 'not_required',
  scratchpad: {},
  metadata: {},
  started_at: '2026-05-01T00:00:00Z',
  completed_at: null,
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
  ...overrides,
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useTeamRunDispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns pending_approval and skips execution when require_approval is true', async () => {
    const { agentWorkspaceService, workflowsService } = await import('@lenserfight/data/repositories')

    vi.mocked(workflowsService.startRun).mockResolvedValue({
      id: 'workflow-run-1',
      workflow_id: 'workflow-1',
      status: 'pending',
      context_inputs: {},
      created_at: '2026-05-01T00:00:00Z',
      triggered_by: null,
    } as never)
    vi.mocked(agentWorkspaceService.createTeamRun).mockResolvedValue(
      makeTeamRun({ approval_status: 'pending', status: 'blocked' })
    )
    vi.mocked(agentWorkspaceService.appendTeamRunEvent).mockResolvedValue(undefined)

    const { useTeamRunDispatch } = await import('./useTeamRunDispatch')
    const { result } = renderHook(() => useTeamRunDispatch())

    let dispatchResult: Awaited<ReturnType<typeof result.current.dispatch>>
    await act(async () => {
      dispatchResult = await result.current.dispatch({
        assignment: makeAssignment({ approval_policy: { require_approval: true } }),
        bootstrap: makeBootstrap(),
      })
    })

    expect(dispatchResult!.status).toBe('pending_approval')
    // getNodes/getEdges must NOT be called when approval is required
    const { workflowsService: wf } = await import('@lenserfight/data/repositories')
    expect(wf.getNodes).not.toHaveBeenCalled()
    expect(wf.getEdges).not.toHaveBeenCalled()
  })

  it('throws when assignment is inactive', async () => {
    const { useTeamRunDispatch } = await import('./useTeamRunDispatch')
    const { result } = renderHook(() => useTeamRunDispatch())

    await expect(
      act(async () => {
        await result.current.dispatch({
          assignment: makeAssignment({ is_active: false }),
          bootstrap: makeBootstrap(),
        })
      })
    ).rejects.toThrow('inactive')
  })

  it('marks team run failed when execution service throws', async () => {
    const { agentWorkspaceService, workflowsService } = await import('@lenserfight/data/repositories')

    vi.mocked(workflowsService.startRun).mockResolvedValue({
      id: 'workflow-run-1',
      workflow_id: 'workflow-1',
      status: 'pending',
      context_inputs: {},
      created_at: '2026-05-01T00:00:00Z',
      triggered_by: null,
    } as never)
    vi.mocked(agentWorkspaceService.createTeamRun).mockResolvedValue(makeTeamRun())
    vi.mocked(agentWorkspaceService.appendTeamRunEvent).mockResolvedValue(undefined)
    vi.mocked(agentWorkspaceService.updateTeamRunStatus).mockResolvedValue(undefined)
    vi.mocked(workflowsService.getNodes).mockResolvedValue([])
    vi.mocked(workflowsService.getEdges).mockResolvedValue([])
    mockExecuteWorkflow.mockRejectedValueOnce(new Error('Provider error'))

    const { useTeamRunDispatch } = await import('./useTeamRunDispatch')
    const { result } = renderHook(() => useTeamRunDispatch())

    await expect(
      act(async () => {
        await result.current.dispatch({
          assignment: makeAssignment(),
          bootstrap: makeBootstrap(),
        })
      })
    ).rejects.toThrow('Provider error')

    expect(agentWorkspaceService.updateTeamRunStatus).toHaveBeenCalledWith(
      'team-run-1',
      'failed',
      expect.any(String),
    )
  })

  it('returns status running and marks team run completed on success', async () => {
    const { agentWorkspaceService, workflowsService } = await import('@lenserfight/data/repositories')

    vi.mocked(workflowsService.startRun).mockResolvedValue({
      id: 'workflow-run-1',
      workflow_id: 'workflow-1',
      status: 'pending',
      context_inputs: {},
      created_at: '2026-05-01T00:00:00Z',
      triggered_by: null,
    } as never)
    vi.mocked(agentWorkspaceService.createTeamRun).mockResolvedValue(makeTeamRun())
    vi.mocked(agentWorkspaceService.appendTeamRunEvent).mockResolvedValue(undefined)
    vi.mocked(agentWorkspaceService.updateTeamRunStatus).mockResolvedValue(undefined)
    vi.mocked(workflowsService.getNodes).mockResolvedValue([])
    vi.mocked(workflowsService.getEdges).mockResolvedValue([])
    mockExecuteWorkflow.mockResolvedValueOnce({ status: 'completed', nodeResults: [] })

    const { useTeamRunDispatch } = await import('./useTeamRunDispatch')
    const { result } = renderHook(() => useTeamRunDispatch())

    let dispatchResult: Awaited<ReturnType<typeof result.current.dispatch>>
    await act(async () => {
      dispatchResult = await result.current.dispatch({
        assignment: makeAssignment(),
        bootstrap: makeBootstrap(),
      })
    })

    expect(dispatchResult!.status).toBe('running')
    expect(agentWorkspaceService.updateTeamRunStatus).toHaveBeenCalledWith(
      'team-run-1',
      'completed',
      expect.any(String),
    )
  })
})
