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
