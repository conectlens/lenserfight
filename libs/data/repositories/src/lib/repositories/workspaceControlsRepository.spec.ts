import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc, mockSchema, mockFrom, mockSelect, mockEq, mockOrder, mockLimit, chainMethods } =
  vi.hoisted(() => {
    const mockSelect = vi.fn()
    const mockEq = vi.fn()
    const mockOrder = vi.fn()
    const mockLimit = vi.fn()
    const chainMethods = { select: mockSelect, eq: mockEq, order: mockOrder, limit: mockLimit }
    Object.values(chainMethods).forEach((m) => m.mockReturnValue(chainMethods))
    return {
      mockRpc: vi.fn(),
      mockSchema: vi.fn(),
      mockFrom: vi.fn(),
      mockSelect,
      mockEq,
      mockOrder,
      mockLimit,
      chainMethods,
    }
  })

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    schema: mockSchema.mockReturnValue({ from: mockFrom.mockReturnValue(chainMethods) }),
    rpc: mockRpc,
  },
}))

import { SupabaseWorkspaceControlsRepository } from './workspaceControlsRepository'

describe('SupabaseWorkspaceControlsRepository', () => {
  let repo: SupabaseWorkspaceControlsRepository

  beforeEach(() => {
    repo = new SupabaseWorkspaceControlsRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockSchema.mockReturnValue({ from: mockFrom.mockReturnValue(chainMethods) })
    Object.values(chainMethods).forEach((mock) => mock.mockReturnValue(chainMethods))
  })

  describe('cancelRun', () => {
    it('calls fn_cancel_run with correct team_run_id', async () => {
      await repo.cancelRun('run-uuid-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_cancel_run', {
        p_team_run_id: 'run-uuid-1',
      })
    })

    it('throws when RPC returns error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('cannot cancel') })
      await expect(repo.cancelRun('run-1')).rejects.toThrow('cannot cancel')
    })
  })

  describe('pauseAgent', () => {
    it('calls fn_pause_agent with ai_lenser_id', async () => {
      await repo.pauseAgent('agent-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_pause_agent', {
        p_ai_lenser_id: 'agent-1',
      })
    })
  })

  describe('resumeAgent', () => {
    it('calls fn_resume_agent with ai_lenser_id', async () => {
      await repo.resumeAgent('agent-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_resume_agent', {
        p_ai_lenser_id: 'agent-1',
      })
    })
  })

  describe('toggleKillSwitch', () => {
    it('calls fn_toggle_kill_switch with enabled=true', async () => {
      await repo.toggleKillSwitch('agent-1', true)
      expect(mockRpc).toHaveBeenCalledWith('fn_toggle_kill_switch', {
        p_ai_lenser_id: 'agent-1',
        p_enabled: true,
      })
    })

    it('calls fn_toggle_kill_switch with enabled=false', async () => {
      await repo.toggleKillSwitch('agent-1', false)
      expect(mockRpc).toHaveBeenCalledWith('fn_toggle_kill_switch', {
        p_ai_lenser_id: 'agent-1',
        p_enabled: false,
      })
    })
  })

  describe('updateWorkspaceSettings', () => {
    it('calls fn_update_workspace_settings with patch', async () => {
      await repo.updateWorkspaceSettings('agent-1', {
        max_parallel_runs: 10,
        global_kill_switch: true,
        budget_enforce: false,
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_update_workspace_settings', {
        p_ai_lenser_id: 'agent-1',
        p_patch: {
          max_parallel_runs: 10,
          global_kill_switch: true,
          budget_enforce: false,
        },
      })
    })
  })

  describe('listRunUnified', () => {
    it('queries v_run_unified by ai_lenser_id', async () => {
      mockLimit.mockResolvedValue({ data: [], error: null })
      await repo.listRunUnified('agent-1', { limit: 20 })
      expect(mockSchema).toHaveBeenCalledWith('agents')
      expect(mockFrom).toHaveBeenCalledWith('v_run_unified')
      expect(mockEq).toHaveBeenCalledWith('ai_lenser_id', 'agent-1')
      expect(mockLimit).toHaveBeenCalledWith(20)
    })

    it('filters by status when provided', async () => {
      mockLimit.mockResolvedValue({ data: [], error: null })
      await repo.listRunUnified('agent-1', { status: 'running' })
      expect(mockEq).toHaveBeenCalledWith('status', 'running')
    })

    it('filters by run_type when provided', async () => {
      mockLimit.mockResolvedValue({ data: [], error: null })
      await repo.listRunUnified('agent-1', { run_type: 'team' })
      expect(mockEq).toHaveBeenCalledWith('run_type', 'team')
    })
  })
})
