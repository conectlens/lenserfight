import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpcMock = vi.fn()
const fromMock = vi.fn()

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    schema: () => ({
      from: (...args: unknown[]) => fromMock(...args),
    }),
  },
}))

vi.mock('../factory', () => ({
  createToolsRepository: vi.fn(() => ({
    invokeTool: async (input: Record<string, unknown>) =>
      rpcMock('fn_invoke_tool', {
        p_team_run_id: input['team_run_id'],
        p_tool_id: input['tool_id'],
        p_ai_lenser_id: input['ai_lenser_id'],
        p_input: input['input'] ?? {},
        p_agent_run_step_id: input['agent_run_step_id'] ?? null,
      }).then((r: { data: unknown; error: unknown }) => {
        if (r.error) throw r.error
        return r.data
      }),
    completeInvocation: async (input: Record<string, unknown>) =>
      rpcMock('fn_complete_tool_invocation', {
        p_invocation_id: input['invocation_id'],
        p_status: input['status'],
        p_output: input['output'] ?? null,
        p_error: input['error'] ?? null,
        p_cost: input['cost_estimate'] ?? null,
      }).then((r: { data: unknown; error: unknown }) => {
        if (r.error) throw r.error
      }),
    approveInvocation: async (invocationId: string) =>
      rpcMock('fn_approve_tool_invocation', { p_invocation_id: invocationId }).then(
        (r: { data: unknown; error: unknown }) => {
          if (r.error) throw r.error
        }
      ),
    rejectInvocation: async (invocationId: string, reason?: string) =>
      rpcMock('fn_reject_tool_invocation', {
        p_invocation_id: invocationId,
        p_reason: reason ?? null,
      }).then((r: { data: unknown; error: unknown }) => {
        if (r.error) throw r.error
      }),
    listPendingApprovals: async (aiLenserId: string) => {
      const builder = fromMock('tool_invocations_v')
      const b = builder
        .select('*')
        .eq('ai_lenser_id', aiLenserId)
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(100)
      const r = await b
      if (r.error) throw r.error
      return r.data ?? []
    },
    listInvocations: async () => [],
  })),
}))

import { toolsService } from './toolsService'

describe('toolsService', () => {
  beforeEach(() => {
    rpcMock.mockReset()
    fromMock.mockReset()
  })

  it('invokeTool sends the namespaced RPC payload', async () => {
    rpcMock.mockResolvedValue({ data: 'inv-1', error: null })

    const id = await toolsService.invokeTool({
      team_run_id: 'run-1',
      tool_id: 'tool-1',
      ai_lenser_id: 'ai-1',
      input: { query: 'sample' },
      agent_run_step_id: 'step-1',
    })

    expect(id).toBe('inv-1')
    expect(rpcMock).toHaveBeenCalledWith('fn_invoke_tool', {
      p_team_run_id: 'run-1',
      p_tool_id: 'tool-1',
      p_ai_lenser_id: 'ai-1',
      p_input: { query: 'sample' },
      p_agent_run_step_id: 'step-1',
    })
  })

  it('completeInvocation rejects via the completion RPC', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })

    await toolsService.completeInvocation({
      invocation_id: 'inv-1',
      status: 'completed',
      output: { ok: true },
      cost_estimate: 0.01,
    })

    expect(rpcMock).toHaveBeenCalledWith('fn_complete_tool_invocation', {
      p_invocation_id: 'inv-1',
      p_status: 'completed',
      p_output: { ok: true },
      p_error: null,
      p_cost: 0.01,
    })
  })

  it('approveInvocation calls fn_approve_tool_invocation', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })
    await toolsService.approveInvocation('inv-9')
    expect(rpcMock).toHaveBeenCalledWith('fn_approve_tool_invocation', {
      p_invocation_id: 'inv-9',
    })
  })

  it('rejectInvocation forwards the reason', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })
    await toolsService.rejectInvocation('inv-9', 'too risky')
    expect(rpcMock).toHaveBeenCalledWith('fn_reject_tool_invocation', {
      p_invocation_id: 'inv-9',
      p_reason: 'too risky',
    })
  })

  it('listPendingApprovals filters by approval_status=pending', async () => {
    const eq = vi.fn()
    const order = vi.fn()
    const limit = vi.fn()
    const select = vi.fn()
    const builder: Record<string, unknown> = {}
    builder.select = select.mockReturnValue(builder)
    builder.eq = eq.mockReturnValue(builder)
    builder.order = order.mockReturnValue(builder)
    builder.limit = limit.mockResolvedValue({ data: [], error: null })
    fromMock.mockReturnValue(builder)

    await toolsService.listPendingApprovals('ai-1')

    expect(fromMock).toHaveBeenCalledWith('tool_invocations_v')
    expect(eq).toHaveBeenCalledWith('ai_lenser_id', 'ai-1')
    expect(eq).toHaveBeenCalledWith('approval_status', 'pending')
    expect(limit).toHaveBeenCalledWith(100)
  })
})
