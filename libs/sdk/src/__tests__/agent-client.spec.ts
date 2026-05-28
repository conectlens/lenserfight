import { describe, expect, it, vi } from 'vitest'

import { createClientFromRpc } from '../index'
import type { SupabaseLikeRpcClient } from '../lib/client'

function mockRpc(data: unknown = []): SupabaseLikeRpcClient {
  return { rpc: vi.fn(async () => ({ data, error: null })) }
}

describe('AgentClient', () => {
  it('browse calls fn_sdk_browse_agents', async () => {
    const rpc = mockRpc([])
    const lf = createClientFromRpc(rpc)
    await lf.agents.browse({ search: 'bot' }, { created_at: '2026-01-01', id: 'x' }, 10)
    expect(rpc.rpc).toHaveBeenCalledWith('fn_sdk_browse_agents', {
      p_search: 'bot',
      p_cursor_created_at: '2026-01-01',
      p_cursor_id: 'x',
      p_limit: 10,
    })
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
