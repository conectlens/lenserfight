import { describe, expect, it, vi, beforeEach } from 'vitest'

const {
  mockRpc,
  mockSchema,
  mockFrom,
  mockSelect,
  mockEq,
  mockOrder,
  mockLimit,
  mockMaybeSingle,
  mockNot,
  mockIs,
  mockUpdate,
  chainMethods,
} = vi.hoisted(() => {
  const mockSelect = vi.fn()
  const mockEq = vi.fn()
  const mockOrder = vi.fn()
  const mockLimit = vi.fn()
  const mockMaybeSingle = vi.fn()
  const mockNot = vi.fn()
  const mockIs = vi.fn()
  const mockUpdate = vi.fn()
  const chainMethods = {
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
    limit: mockLimit,
    maybeSingle: mockMaybeSingle,
    not: mockNot,
    is: mockIs,
    update: mockUpdate,
  }
  Object.values(chainMethods).forEach((m) => m.mockReturnValue(chainMethods))
  return {
    mockRpc: vi.fn(),
    mockSchema: vi.fn(),
    mockFrom: vi.fn(),
    mockSelect,
    mockEq,
    mockOrder,
    mockLimit,
    mockMaybeSingle,
    mockNot,
    mockIs,
    mockUpdate,
    chainMethods,
  }
})

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    schema: mockSchema.mockReturnValue({ from: mockFrom.mockReturnValue(chainMethods) }),
    rpc: mockRpc,
  },
}))

import { SupabaseRunReportsRepository } from './runReportsRepository'

describe('SupabaseRunReportsRepository', () => {
  let repo: SupabaseRunReportsRepository

  beforeEach(() => {
    repo = new SupabaseRunReportsRepository()
    vi.clearAllMocks()
    mockSchema.mockReturnValue({ from: mockFrom.mockReturnValue(chainMethods) })
    Object.values(chainMethods).forEach((mock) => {
      mock.mockReturnValue(chainMethods)
    })
  })

  describe('listRunReports', () => {
    it('calls fn_list_run_reports with ai_lenser_id and default limit 100', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listRunReports('agent-1', { limit: 10 })
      expect(mockRpc).toHaveBeenCalledWith('fn_list_run_reports', {
        p_ai_lenser_id: 'agent-1',
        p_limit: 10,
        p_cursor: null,
      })
    })

    it('filters by outcome in JavaScript after RPC', async () => {
      const rows = [
        { outcome: 'failed', id: '1' },
        { outcome: 'completed', id: '2' },
      ]
      mockRpc.mockResolvedValue({ data: rows, error: null })
      const result = await repo.listRunReports('agent-1', { outcome: 'failed' })
      expect(result).toHaveLength(1)
      expect((result[0] as Record<string, unknown>)['outcome']).toBe('failed')
    })

    it('throws on supabase error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('db error') })
      await expect(repo.listRunReports('agent-1')).rejects.toThrow('db error')
    })
  })

  describe('createRunReport', () => {
    it('calls fn_create_run_report with team_run_id', async () => {
      mockRpc.mockResolvedValue({ data: 'report-uuid', error: null })
      const id = await repo.createRunReport('run-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_create_run_report', {
        p_team_run_id: 'run-1',
      })
      expect(id).toBe('report-uuid')
    })

    it('throws when RPC returns error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('rpc error') })
      await expect(repo.createRunReport('run-1')).rejects.toThrow('rpc error')
    })
  })

  describe('recordRunIncident', () => {
    it('calls fn_record_run_incident with all params', async () => {
      mockRpc.mockResolvedValue({ data: 'incident-uuid', error: null })
      const id = await repo.recordRunIncident({
        run_report_id: 'report-1',
        incident_type: 'tool_failure',
        severity: 'high',
        title: 'Tool failed',
        description: 'Details',
        context: { foo: 'bar' },
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_record_run_incident', {
        p_run_report_id: 'report-1',
        p_incident_type: 'tool_failure',
        p_severity: 'high',
        p_title: 'Tool failed',
        p_description: 'Details',
        p_context: { foo: 'bar' },
      })
      expect(id).toBe('incident-uuid')
    })
  })
})
