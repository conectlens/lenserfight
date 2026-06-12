import { describe, expect, it, vi } from 'vitest'

import { createClientFromRpc } from '../index'
import type { SupabaseLikeRpcClient } from '../lib/client'

function mockRpc(data: unknown = []): SupabaseLikeRpcClient {
  return { rpc: vi.fn(async () => ({ data, error: null })) }
}

function errorRpc(): SupabaseLikeRpcClient {
  return { rpc: vi.fn(async () => ({ data: null, error: { message: 'denied' } })) }
}

describe('AgentClient', () => {
  describe('browse', () => {
    it('calls fn_list_agents_by_owner with ownerId', async () => {
      const rpc = mockRpc([])
      const lf = createClientFromRpc(rpc)
      await lf.agents.browse({ ownerId: 'owner-1' })
      expect(rpc.rpc).toHaveBeenCalledWith('fn_list_agents_by_owner', {
        p_owner_lenser_id: 'owner-1',
      })
    })

    it('returns items sliced to limit', async () => {
      const agents = [
        { id: 'a1', handle: 'bot1' },
        { id: 'a2', handle: 'bot2' },
        { id: 'a3', handle: 'bot3' },
      ]
      const rpc = mockRpc(agents)
      const lf = createClientFromRpc(rpc)
      const page = await lf.agents.browse({ ownerId: 'owner-1' }, 2)
      expect(page.items).toHaveLength(2)
    })

    it('always returns null nextCursor', async () => {
      const rpc = mockRpc([{ id: 'a1', handle: 'bot' }])
      const lf = createClientFromRpc(rpc)
      const page = await lf.agents.browse({ ownerId: 'owner-1' }, 1)
      expect(page.nextCursor).toBeNull()
    })

    it('throws on error', async () => {
      const lf = createClientFromRpc(errorRpc())
      await expect(lf.agents.browse({ ownerId: 'owner-1' })).rejects.toThrowError(/fn_list_agents_by_owner failed/)
    })
  })

  describe('getById', () => {
    it('calls fn_get_agent_profile with p_ai_lenser_id', async () => {
      const detail = { id: 'a1', handle: 'bot' }
      const rpc = mockRpc(detail)
      const lf = createClientFromRpc(rpc)
      const result = await lf.agents.getById('a1')
      expect(rpc.rpc).toHaveBeenCalledWith('fn_get_agent_profile', { p_ai_lenser_id: 'a1' })
      expect(result).toEqual(detail)
    })

    it('returns null when data is null', async () => {
      const rpc = mockRpc(null)
      const lf = createClientFromRpc(rpc)
      const result = await lf.agents.getById('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('getLensBindings', () => {
    it('calls fn_list_agent_lens_bindings with p_ai_lenser_id', async () => {
      const rpc = mockRpc([{ id: 'b1', lens_id: 'l1' }])
      const lf = createClientFromRpc(rpc)
      const result = await lf.agents.getLensBindings('a1')
      expect(rpc.rpc).toHaveBeenCalledWith('fn_list_agent_lens_bindings', {
        p_ai_lenser_id: 'a1',
        p_limit: 50,
        p_offset: 0,
      })
      expect(result).toHaveLength(1)
    })
  })

  describe('getModelBindings', () => {
    it('calls fn_list_agent_model_bindings with p_ai_lenser_id', async () => {
      const rpc = mockRpc([])
      const lf = createClientFromRpc(rpc)
      await lf.agents.getModelBindings('a1')
      expect(rpc.rpc).toHaveBeenCalledWith('fn_list_agent_model_bindings', {
        p_ai_lenser_id: 'a1',
        p_limit: 50,
        p_offset: 0,
      })
    })
  })
})
