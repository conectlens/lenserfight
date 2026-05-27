import { describe, expect, it, vi } from 'vitest'

import { createClientFromRpc } from '../index'
import type { SupabaseLikeRpcClient } from '../lib/client'

function mockRpc(data: unknown = []): SupabaseLikeRpcClient {
  return { rpc: vi.fn(async () => ({ data, error: null })) }
}

function errorRpc(): SupabaseLikeRpcClient {
  return { rpc: vi.fn(async () => ({ data: null, error: { message: 'denied' } })) }
}

describe('LensClient', () => {
  describe('browse', () => {
    it('calls fn_sdk_browse_lenses with correct params', async () => {
      const rpc = mockRpc([])
      const lf = createClientFromRpc(rpc)
      await lf.lenses.browse({ tag: 'ai', kind: 'text' }, { created_at: '2026-01-01', id: 'abc' }, 30)
      expect(rpc.rpc).toHaveBeenCalledWith('fn_sdk_browse_lenses', {
        p_search: null,
        p_tag: 'ai',
        p_kind: 'text',
        p_cursor_created_at: '2026-01-01',
        p_cursor_id: 'abc',
        p_limit: 30,
      })
    })

    it('clamps limit to [1, 100]', async () => {
      const rpc = mockRpc([])
      const lf = createClientFromRpc(rpc)
      await lf.lenses.browse({}, undefined, 9999)
      const params = (rpc.rpc as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<string, unknown>
      expect(params['p_limit']).toBe(100)
    })

    it('throws on error', async () => {
      const lf = createClientFromRpc(errorRpc())
      await expect(lf.lenses.browse()).rejects.toThrowError(/fn_sdk_browse_lenses failed/)
    })
  })

  describe('search', () => {
    it('delegates to browse with search param', async () => {
      const rpc = mockRpc([])
      const lf = createClientFromRpc(rpc)
      await lf.lenses.search('hello world', { tag: 'test' })
      const params = (rpc.rpc as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<string, unknown>
      expect(params['p_search']).toBe('hello world')
      expect(params['p_tag']).toBe('test')
    })
  })

  describe('getById', () => {
    it('calls fn_get_lens_detail_bootstrap (existing RPC)', async () => {
      const detail = { id: 'x', title: 'Test' }
      const rpc = mockRpc(detail)
      const lf = createClientFromRpc(rpc)
      const result = await lf.lenses.getById('lens-123')
      expect(rpc.rpc).toHaveBeenCalledWith('fn_get_lens_detail_bootstrap', { p_lens_id: 'lens-123' })
      expect(result).toEqual(detail)
    })

    it('returns null when response has error field', async () => {
      const rpc = mockRpc({ error: 'not_found' })
      const lf = createClientFromRpc(rpc)
      const result = await lf.lenses.getById('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('getVersion', () => {
    it('combines fn_get_lens_version_detail + fn_get_lens_version_parameters', async () => {
      const rpc: SupabaseLikeRpcClient = {
        rpc: vi.fn(async (fn: string) => {
          if (fn === 'fn_get_lens_version_detail') {
            return { data: [{ id: 'v1', lens_id: 'l1', version_number: 1 }], error: null }
          }
          return { data: [{ id: 'p1', label: 'topic' }], error: null }
        }),
      }
      const lf = createClientFromRpc(rpc)
      const result = await lf.lenses.getVersion('v1')
      expect(result).toBeTruthy()
      expect(rpc.rpc).toHaveBeenCalledWith('fn_get_lens_version_detail', { p_version_id: 'v1' })
      expect(rpc.rpc).toHaveBeenCalledWith('fn_get_lens_version_parameters', { p_version_id: 'v1' })
    })
  })
})
