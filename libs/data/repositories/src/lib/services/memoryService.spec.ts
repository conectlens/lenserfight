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
  createMemoryRepository: vi.fn(() => ({
    writeMemoryEntry: async (input: Record<string, unknown>) =>
      rpcMock('fn_write_memory_entry', {
        p_profile_id: input['profile_id'],
        p_scope: input['scope'],
        p_source: input['source'],
        p_content: input['content'],
        p_confidence: input['confidence'] ?? 0.5,
        p_expires_at: input['expires_at'] ?? null,
        p_team_run_id: input['team_run_id'] ?? null,
        p_metadata: input['metadata'] ?? {},
      }).then((r: { data: unknown; error: unknown }) => {
        if (r.error) throw r.error
        return r.data
      }),
    readMemoryEntries: async (input: Record<string, unknown>) =>
      rpcMock('fn_read_memory_entries', {
        p_profile_id: input['profile_id'],
        p_scope: input['scope'] ?? null,
        p_limit: input['limit'] ?? 10,
        p_team_run_id: input['team_run_id'] ?? null,
      }).then((r: { data: unknown; error: unknown }) => {
        if (r.error) throw r.error
        return r.data ?? []
      }),
    redactMemoryEntry: async (memoryId: string, reason?: string) =>
      rpcMock('fn_redact_memory_entry', {
        p_memory_id: memoryId,
        p_reason: reason ?? null,
      }).then((r: { data: unknown; error: unknown }) => {
        if (r.error) throw r.error
      }),
    summarizeMemoryProfile: async (profileId: string) =>
      rpcMock('fn_summarize_memory_profile', { p_profile_id: profileId }).then(
        (r: { data: unknown; error: unknown }) => {
          if (r.error) throw r.error
          const raw = r.data as Record<string, unknown> | null
          return {
            profile_id: profileId,
            count: raw?.['count'] ?? 0,
            last_written_at: raw?.['last_written_at'] ?? null,
            scopes: raw?.['scopes'] ?? {},
          }
        }
      ),
    listMemoryEntries: async (profileId: string, options?: Record<string, unknown>) => {
      const builder = fromMock('memories_v')
      let b = builder.select('*').eq('profile_id', profileId).eq('is_redacted', false)
      if (options?.['scope']) b = b.eq('scope', options['scope'])
      b = b.order('created_at', { ascending: false }).limit(options?.['limit'] ?? 50)
      const r = await b
      if (r.error) throw r.error
      return r.data ?? []
    },
    listMemoryAccessLogs: async () => [],
  })),
}))

import { memoryService } from './memoryService'

describe('memoryService', () => {
  beforeEach(() => {
    rpcMock.mockReset()
    fromMock.mockReset()
  })

  it('writeMemoryEntry sends the namespaced RPC payload', async () => {
    rpcMock.mockResolvedValue({ data: 'mem-1', error: null })

    const id = await memoryService.writeMemoryEntry({
      profile_id: 'profile-1',
      scope: 'project',
      source: 'manual',
      content: 'remember this',
      confidence: 0.8,
      team_run_id: 'run-1',
    })

    expect(id).toBe('mem-1')
    expect(rpcMock).toHaveBeenCalledWith('fn_write_memory_entry', {
      p_profile_id: 'profile-1',
      p_scope: 'project',
      p_source: 'manual',
      p_content: 'remember this',
      p_confidence: 0.8,
      p_expires_at: null,
      p_team_run_id: 'run-1',
      p_metadata: {},
    })
  })

  it('readMemoryEntries forwards filters and team_run_id for audit logging', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null })

    await memoryService.readMemoryEntries({
      profile_id: 'profile-2',
      scope: 'conversation',
      limit: 7,
      team_run_id: 'run-9',
    })

    expect(rpcMock).toHaveBeenCalledWith('fn_read_memory_entries', {
      p_profile_id: 'profile-2',
      p_scope: 'conversation',
      p_limit: 7,
      p_team_run_id: 'run-9',
    })
  })

  it('redactMemoryEntry passes the reason through', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })

    await memoryService.redactMemoryEntry('mem-9', 'pii cleanup')

    expect(rpcMock).toHaveBeenCalledWith('fn_redact_memory_entry', {
      p_memory_id: 'mem-9',
      p_reason: 'pii cleanup',
    })
  })

  it('summarizeMemoryProfile returns a normalized summary on missing data', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })

    const summary = await memoryService.summarizeMemoryProfile('profile-3')

    expect(summary).toEqual({
      profile_id: 'profile-3',
      count: 0,
      last_written_at: null,
      scopes: {},
    })
  })

  it('listMemoryEntries filters via the view and excludes redacted by default', async () => {
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

    await memoryService.listMemoryEntries('profile-1', { scope: 'project', limit: 25 })

    expect(fromMock).toHaveBeenCalledWith('memories_v')
    expect(eq).toHaveBeenCalledWith('profile_id', 'profile-1')
    expect(eq).toHaveBeenCalledWith('scope', 'project')
    expect(eq).toHaveBeenCalledWith('is_redacted', false)
    expect(limit).toHaveBeenCalledWith(25)
  })
})
