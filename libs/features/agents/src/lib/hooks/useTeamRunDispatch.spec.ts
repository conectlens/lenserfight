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
    triggerPostRunEvaluations: vi.fn().mockResolvedValue(undefined),
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
  memoryService: {
    readMemoryEntries: vi.fn().mockResolvedValue([]),
    writeMemoryEntry: vi.fn().mockResolvedValue('mem-id'),
  },
  toolsService: {
    invokeTool: vi.fn().mockResolvedValue('inv-id'),
    completeInvocation: vi.fn().mockResolvedValue(undefined),
    approveInvocation: vi.fn().mockResolvedValue(undefined),
    rejectInvocation: vi.fn().mockResolvedValue(undefined),
    listInvocations: vi.fn().mockResolvedValue([]),
    listPendingApprovals: vi.fn().mockResolvedValue([]),
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

  describe('memory injection and write gate', () => {
    const memoryProfile = {
      id: 'mem-profile-1',
      ai_lenser_id: 'ai-lenser-1',
      name: 'Default',
      scope_type: 'agent',
      isolation_mode: 'isolated',
      retention_days: 30,
      visibility: 'private',
      summary_strategy: 'rolling_summary',
      reset_policy: 'manual',
      is_default: true,
      created_at: '2026-05-01T00:00:00Z',
      updated_at: '2026-05-01T00:00:00Z',
    }

    it('prepends a Context Memory block to the lens template when entries exist', async () => {
      const { agentWorkspaceService, lensesService, memoryService, workflowsService } =
        await import('@lenserfight/data/repositories')

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
      vi.mocked(lensesService.getLatestPublishedVersion).mockResolvedValue({
        templateBody: 'Original template',
      } as never)
      vi.mocked(memoryService.readMemoryEntries).mockResolvedValue([
        {
          id: 'm1',
          profile_id: 'mem-profile-1',
          ai_lenser_id: 'ai-lenser-1',
          scope: 'project',
          source: 'agent',
          content: 'past insight',
          embedding_metadata: {},
          confidence: 0.9,
          expires_at: null,
          team_run_id: null,
          is_redacted: false,
          created_at: '2026-05-01T00:00:00Z',
        },
      ] as never)

      let capturedTemplate = ''
      mockExecuteWorkflow.mockImplementationOnce(async (_nodes, _edges, ctx) => {
        capturedTemplate = await ctx.resolveLensTemplate('lens-1', null)
        return { status: 'completed', nodeResults: [] }
      })

      const { useTeamRunDispatch } = await import('./useTeamRunDispatch')
      const { result } = renderHook(() => useTeamRunDispatch())

      await act(async () => {
        await result.current.dispatch({
          assignment: makeAssignment(),
          bootstrap: makeBootstrap({
            profiles: {
              personality: [],
              memory: [memoryProfile],
              tools: [],
              models: makeBootstrap().profiles.models,
            },
          } as never),
        })
      })

      expect(memoryService.readMemoryEntries).toHaveBeenCalledWith({
        profile_id: 'mem-profile-1',
        scope: 'project',
        limit: 5,
        team_run_id: 'team-run-1',
      })
      expect(capturedTemplate).toContain('## Context Memory')
      expect(capturedTemplate).toContain('past insight')
      expect(capturedTemplate).toContain('Original template')
    })

    it('writes buffered memory entries only after a successful run', async () => {
      const { agentWorkspaceService, memoryService, workflowsService } = await import(
        '@lenserfight/data/repositories'
      )

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

      mockExecuteWorkflow.mockImplementationOnce(async (_nodes, _edges, ctx) => {
        await ctx.onNodeStatusChange('node-a', {
          nodeId: 'node-a',
          status: 'completed',
          outputData: {
            __lf_memory_writes: [
              { content: 'derived fact', scope: 'project', source: 'agent', confidence: 0.7 },
            ],
          },
        })
        return { status: 'completed', nodeResults: [] }
      })

      const { useTeamRunDispatch } = await import('./useTeamRunDispatch')
      const { result } = renderHook(() => useTeamRunDispatch())

      await act(async () => {
        await result.current.dispatch({
          assignment: makeAssignment(),
          bootstrap: makeBootstrap({
            profiles: {
              personality: [],
              memory: [memoryProfile],
              tools: [],
              models: makeBootstrap().profiles.models,
            },
          } as never),
        })
      })

      // Allow microtasks to flush the fire-and-forget write batch.
      await new Promise((r) => setTimeout(r, 0))

      expect(memoryService.writeMemoryEntry).toHaveBeenCalledTimes(1)
      expect(memoryService.writeMemoryEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          profile_id: 'mem-profile-1',
          scope: 'project',
          source: 'agent',
          content: 'derived fact',
          confidence: 0.7,
          team_run_id: 'team-run-1',
        }),
      )
    })

    it('routes tool_invocation_started events to toolsService.invokeTool', async () => {
      const { agentWorkspaceService, toolsService, workflowsService } = await import(
        '@lenserfight/data/repositories'
      )

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
      vi.mocked(toolsService.invokeTool).mockResolvedValueOnce('inv-99')
      vi.mocked(toolsService.completeInvocation).mockResolvedValue(undefined)

      mockExecuteWorkflow.mockImplementationOnce(async (_nodes, _edges, ctx) => {
        await ctx.onEvent({
          name: 'tool_invocation_started',
          nodeId: 'node-a',
          metadata: {
            callId: 'call-1',
            toolId: 'tool-x',
            input: { query: 'hi' },
            stepId: 'step-1',
          },
        })
        await ctx.onEvent({
          name: 'tool_invocation_completed',
          nodeId: 'node-a',
          metadata: { callId: 'call-1', output: { ok: true }, cost: 0.01 },
        })
        return { status: 'completed', nodeResults: [] }
      })

      const { useTeamRunDispatch } = await import('./useTeamRunDispatch')
      const { result } = renderHook(() => useTeamRunDispatch())

      await act(async () => {
        await result.current.dispatch({
          assignment: makeAssignment(),
          bootstrap: makeBootstrap(),
        })
      })

      expect(toolsService.invokeTool).toHaveBeenCalledWith({
        team_run_id: 'team-run-1',
        tool_id: 'tool-x',
        ai_lenser_id: 'ai-lenser-1',
        input: { query: 'hi' },
        agent_run_step_id: 'step-1',
      })
      expect(toolsService.completeInvocation).toHaveBeenCalledWith({
        invocation_id: 'inv-99',
        status: 'completed',
        output: { ok: true },
        cost_estimate: 0.01,
      })
    })

    it('does NOT write buffered memory entries when the run fails', async () => {
      const { agentWorkspaceService, memoryService, workflowsService } = await import(
        '@lenserfight/data/repositories'
      )

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

      mockExecuteWorkflow.mockImplementationOnce(async (_nodes, _edges, ctx) => {
        await ctx.onNodeStatusChange('node-a', {
          nodeId: 'node-a',
          status: 'completed',
          outputData: {
            __lf_memory_writes: [{ content: 'should not persist', scope: 'project', source: 'agent' }],
          },
        })
        throw new Error('Provider failure')
      })

      const { useTeamRunDispatch } = await import('./useTeamRunDispatch')
      const { result } = renderHook(() => useTeamRunDispatch())

      await expect(
        act(async () => {
          await result.current.dispatch({
            assignment: makeAssignment(),
            bootstrap: makeBootstrap({
              profiles: {
                personality: [],
                memory: [memoryProfile],
                tools: [],
                models: makeBootstrap().profiles.models,
              },
            } as never),
          })
        }),
      ).rejects.toThrow('Provider failure')

      await new Promise((r) => setTimeout(r, 0))

      expect(memoryService.writeMemoryEntry).not.toHaveBeenCalled()
    })
  })
})
