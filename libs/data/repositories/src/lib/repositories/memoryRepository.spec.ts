import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { SupabaseMemoryRepository } from './memoryRepository'

const PROFILE_ID = 'profile-uuid-1'
const MEMORY_ID = 'memory-uuid-1'
const TEAM_RUN_ID = 'run-uuid-1'

const rawEntry = {
  id: MEMORY_ID,
  profile_id: PROFILE_ID,
  memory_type: 'observation',
  content: 'User prefers concise answers',
  confidence: 0.9,
  is_redacted: false,
  created_at: '2026-01-01T00:00:00Z',
}

describe('SupabaseMemoryRepository', () => {
  let repo: SupabaseMemoryRepository

  beforeEach(() => {
    repo = new SupabaseMemoryRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---------------------------------------------------------------------------
  // listMemoryEntries
  // ---------------------------------------------------------------------------
  describe('listMemoryEntries', () => {
    it('calls fn_list_agent_memories with default limit 100', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listMemoryEntries(PROFILE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_agent_memories', {
        p_ai_lenser_id: PROFILE_ID,
        p_limit: 100,
        p_cursor: null,
      })
    })

    it('uses provided limit', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listMemoryEntries(PROFILE_ID, { limit: 25 })
      expect(mockRpc).toHaveBeenCalledWith('fn_list_agent_memories', expect.objectContaining({ p_limit: 25 }))
    })

    it('falls back to limit 100 when limit is 0', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listMemoryEntries(PROFILE_ID, { limit: 0 })
      expect(mockRpc).toHaveBeenCalledWith('fn_list_agent_memories', expect.objectContaining({ p_limit: 100 }))
    })

    it('filters by scope (memory_type) client-side', async () => {
      const entries = [
        { ...rawEntry, memory_type: 'observation' },
        { ...rawEntry, id: 'mem-2', memory_type: 'instruction' },
      ]
      mockRpc.mockResolvedValue({ data: entries, error: null })
      const result = await repo.listMemoryEntries(PROFILE_ID, { scope: 'observation' as any })
      expect(result).toHaveLength(1)
      expect((result[0] as any).memory_type).toBe('observation')
    })

    it('excludes redacted entries by default', async () => {
      const entries = [
        { ...rawEntry, is_redacted: false },
        { ...rawEntry, id: 'mem-2', is_redacted: true },
      ]
      mockRpc.mockResolvedValue({ data: entries, error: null })
      const result = await repo.listMemoryEntries(PROFILE_ID)
      expect(result).toHaveLength(1)
      expect((result[0] as any).is_redacted).toBe(false)
    })

    it('includes redacted entries when includeRedacted=true', async () => {
      const entries = [
        { ...rawEntry, is_redacted: false },
        { ...rawEntry, id: 'mem-2', is_redacted: true },
      ]
      mockRpc.mockResolvedValue({ data: entries, error: null })
      const result = await repo.listMemoryEntries(PROFILE_ID, { includeRedacted: true })
      expect(result).toHaveLength(2)
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.listMemoryEntries(PROFILE_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('list error') })
      await expect(repo.listMemoryEntries(PROFILE_ID)).rejects.toThrow('list error')
    })
  })

  // ---------------------------------------------------------------------------
  // readMemoryEntries
  // ---------------------------------------------------------------------------
  describe('readMemoryEntries', () => {
    it('calls fn_read_memory_entries with all provided fields', async () => {
      mockRpc.mockResolvedValue({ data: [rawEntry], error: null })
      const result = await repo.readMemoryEntries({
        profile_id: PROFILE_ID,
        scope: 'observation' as any,
        limit: 5,
        team_run_id: TEAM_RUN_ID,
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_read_memory_entries', {
        p_profile_id: PROFILE_ID,
        p_scope: 'observation',
        p_limit: 5,
        p_team_run_id: TEAM_RUN_ID,
      })
      expect(result).toEqual([rawEntry])
    })

    it('passes null for optional fields when absent', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.readMemoryEntries({ profile_id: PROFILE_ID })
      expect(mockRpc).toHaveBeenCalledWith('fn_read_memory_entries', {
        p_profile_id: PROFILE_ID,
        p_scope: null,
        p_limit: 10,
        p_team_run_id: null,
      })
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.readMemoryEntries({ profile_id: PROFILE_ID })).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('read error') })
      await expect(repo.readMemoryEntries({ profile_id: PROFILE_ID })).rejects.toThrow('read error')
    })
  })

  // ---------------------------------------------------------------------------
  // writeMemoryEntry
  // ---------------------------------------------------------------------------
  describe('writeMemoryEntry', () => {
    it('calls fn_write_memory_entry with all fields and returns id', async () => {
      mockRpc.mockResolvedValue({ data: MEMORY_ID, error: null })
      const result = await repo.writeMemoryEntry({
        profile_id: PROFILE_ID,
        scope: 'observation' as any,
        source: 'inference',
        content: 'User prefers concise answers',
        confidence: 0.9,
        expires_at: '2027-01-01T00:00:00Z',
        team_run_id: TEAM_RUN_ID,
        metadata: { tag: 'style' },
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_write_memory_entry', {
        p_profile_id: PROFILE_ID,
        p_scope: 'observation',
        p_source: 'inference',
        p_content: 'User prefers concise answers',
        p_confidence: 0.9,
        p_expires_at: '2027-01-01T00:00:00Z',
        p_team_run_id: TEAM_RUN_ID,
        p_metadata: { tag: 'style' },
      })
      expect(result).toBe(MEMORY_ID)
    })

    it('uses default confidence 0.5 and empty metadata when not provided', async () => {
      mockRpc.mockResolvedValue({ data: MEMORY_ID, error: null })
      await repo.writeMemoryEntry({
        profile_id: PROFILE_ID,
        scope: 'observation' as any,
        source: 'inference',
        content: 'some fact',
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_write_memory_entry', expect.objectContaining({
        p_confidence: 0.5,
        p_expires_at: null,
        p_team_run_id: null,
        p_metadata: {},
      }))
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('write error') })
      await expect(repo.writeMemoryEntry({ profile_id: PROFILE_ID, scope: 'observation' as any, source: 'inference', content: 'x' })).rejects.toThrow('write error')
    })
  })

  // ---------------------------------------------------------------------------
  // redactMemoryEntry
  // ---------------------------------------------------------------------------
  describe('redactMemoryEntry', () => {
    it('calls fn_redact_memory_entry with p_memory_id', async () => {
      await repo.redactMemoryEntry(MEMORY_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_redact_memory_entry', {
        p_memory_id: MEMORY_ID,
        p_reason: null,
      })
    })

    it('passes reason when provided', async () => {
      await repo.redactMemoryEntry(MEMORY_ID, 'policy violation')
      expect(mockRpc).toHaveBeenCalledWith('fn_redact_memory_entry', {
        p_memory_id: MEMORY_ID,
        p_reason: 'policy violation',
      })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('redact error') })
      await expect(repo.redactMemoryEntry(MEMORY_ID)).rejects.toThrow('redact error')
    })
  })

  // ---------------------------------------------------------------------------
  // summarizeMemoryProfile
  // ---------------------------------------------------------------------------
  describe('summarizeMemoryProfile', () => {
    it('calls fn_summarize_memory_profile with p_profile_id', async () => {
      const summary = { profile_id: PROFILE_ID, count: 5, last_written_at: '2026-01-01T00:00:00Z', scopes: { observation: 5 } }
      mockRpc.mockResolvedValue({ data: summary, error: null })
      const result = await repo.summarizeMemoryProfile(PROFILE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_summarize_memory_profile', { p_profile_id: PROFILE_ID })
      expect(result).toEqual(summary)
    })

    it('returns empty summary when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      const result = await repo.summarizeMemoryProfile(PROFILE_ID)
      expect(result).toEqual({
        profile_id: PROFILE_ID,
        count: 0,
        last_written_at: null,
        scopes: {},
      })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('summarize error') })
      await expect(repo.summarizeMemoryProfile(PROFILE_ID)).rejects.toThrow('summarize error')
    })
  })

  // ---------------------------------------------------------------------------
  // listMemoryAccessLogs
  // ---------------------------------------------------------------------------
  describe('listMemoryAccessLogs', () => {
    it('calls fn_list_memory_access_logs with default limit 50', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listMemoryAccessLogs(MEMORY_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_memory_access_logs', {
        p_memory_id: MEMORY_ID,
        p_limit: 50,
      })
    })

    it('supports custom limit', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listMemoryAccessLogs(MEMORY_ID, 10)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_memory_access_logs', { p_memory_id: MEMORY_ID, p_limit: 10 })
    })

    it('returns access log records', async () => {
      const logs = [{ id: 'log-1', memory_id: MEMORY_ID, accessed_at: '2026-01-01T00:00:00Z' }]
      mockRpc.mockResolvedValue({ data: logs, error: null })
      expect(await repo.listMemoryAccessLogs(MEMORY_ID)).toEqual(logs)
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.listMemoryAccessLogs(MEMORY_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('logs error') })
      await expect(repo.listMemoryAccessLogs(MEMORY_ID)).rejects.toThrow('logs error')
    })
  })
})
