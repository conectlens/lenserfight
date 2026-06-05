import { describe, expect, it, vi } from 'vitest'

import { createClientFromRpc } from '../index'
import type { SupabaseLikeRpcClient } from '../lib/client'

function mockRpc(data: unknown = []): SupabaseLikeRpcClient {
  return { rpc: vi.fn(async () => ({ data, error: null })) }
}

describe('AgentClient', () => {
  it('browse calls fn_sdk_browse_agents with all filter params', async () => {
    const rpc = mockRpc([])
    const lf = createClientFromRpc(rpc)
    await lf.agents.browse(
      { search: 'bot', runtimePref: 'cloud', canJoinBattles: true },
      { created_at: '2026-01-01', id: 'x' },
      10,
    )
    expect(rpc.rpc).toHaveBeenCalledWith('fn_sdk_browse_agents', {
      p_search: 'bot',
      p_runtime_pref: 'cloud',
      p_can_join_battles: true,
      p_cursor_created_at: '2026-01-01',
      p_cursor_id: 'x',
      p_limit: 10,
    })
  })

  it('browse returns SdkAgentPage with nextCursor when a full page is returned', async () => {
    const agent = { id: 'a1', handle: 'bot', createdAt: '2026-01-01T00:00:00Z' }
    const rpc = mockRpc([agent])
    const lf = createClientFromRpc(rpc)
    const page = await lf.agents.browse({}, undefined, 1)
    expect(page.items).toHaveLength(1)
    expect(page.nextCursor).toEqual({ created_at: agent.createdAt, id: agent.id })
  })

  it('browse returns null nextCursor when fewer items than limit are returned', async () => {
    const rpc = mockRpc([])
    const lf = createClientFromRpc(rpc)
    const page = await lf.agents.browse({}, undefined, 20)
    expect(page.items).toHaveLength(0)
    expect(page.nextCursor).toBeNull()
  })

  it('getById calls fn_sdk_get_agent_detail', async () => {
    const detail = { id: 'a1', handle: 'bot' }
    const rpc = mockRpc(detail)
    const lf = createClientFromRpc(rpc)
    const result = await lf.agents.getById('a1')
    expect(rpc.rpc).toHaveBeenCalledWith('fn_sdk_get_agent_detail', { p_agent_id: 'a1' })
    expect(result).toEqual(detail)
  })

  it('getLensBindings calls fn_sdk_get_agent_lens_bindings', async () => {
    const rpc = mockRpc([{ id: 'b1', lens_id: 'l1' }])
    const lf = createClientFromRpc(rpc)
    const result = await lf.agents.getLensBindings('a1')
    expect(rpc.rpc).toHaveBeenCalledWith('fn_sdk_get_agent_lens_bindings', { p_agent_id: 'a1' })
    expect(result).toHaveLength(1)
  })

  it('getModelBindings calls fn_sdk_get_agent_model_bindings', async () => {
    const rpc = mockRpc([])
    const lf = createClientFromRpc(rpc)
    await lf.agents.getModelBindings('a1')
    expect(rpc.rpc).toHaveBeenCalledWith('fn_sdk_get_agent_model_bindings', { p_agent_id: 'a1' })
  })
})
