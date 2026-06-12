import { describe, expect, it, vi } from 'vitest'

import { createClientFromRpc } from '../index'
import type { SupabaseLikeRpcClient } from '../lib/client'

function mockRpc(data: unknown = { data: [], count: 0 }): SupabaseLikeRpcClient {
  return { rpc: vi.fn(async () => ({ data, error: null })) }
}

function errorRpc(): SupabaseLikeRpcClient {
  return { rpc: vi.fn(async () => ({ data: null, error: { message: 'denied' } })) }
}

describe('LensClient', () => {
  describe('browse', () => {
    it('calls fn_mcp_lens_list for non-search browse', async () => {
      const rpc = mockRpc({ data: [], count: 0 })
      const lf = createClientFromRpc(rpc)
      await lf.lenses.browse({ kind: 'text' }, 10, 30)
      expect(rpc.rpc).toHaveBeenCalledWith('fn_mcp_lens_list', {
        p_limit: 30,
        p_offset: 10,
        p_visibility: 'public',
        p_status: null,
        p_lenser_id: null,
        p_include_archived: false,
      })
    })

    it('calls fn_mcp_lens_search when search filter is provided', async () => {
      const rpc = mockRpc({ data: [], count: 0 })
      const lf = createClientFromRpc(rpc)
      await lf.lenses.browse({ search: 'ai tools' }, 0, 20)
      expect(rpc.rpc).toHaveBeenCalledWith('fn_mcp_lens_search', {
        p_query: 'ai tools',
        p_visibility: 'public',
        p_limit: 20,
        p_offset: 0,
      })
    })

    it('clamps limit to [1, 100]', async () => {
      const rpc = mockRpc({ data: [], count: 0 })
      const lf = createClientFromRpc(rpc)
      await lf.lenses.browse({}, 0, 9999)
      const params = (rpc.rpc as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<string, unknown>
      expect(params['p_limit']).toBe(100)
    })

    it('maps fn_mcp_lens_list rows to SdkLensSummary shape', async () => {
      const row = {
        id: 'lens-1',
        lenser_id: 'owner-1',
        title: 'Test Lens',
        description: 'A description',
        visibility: 'public',
        status: 'published',
        author_handle: 'alice',
        created_at: '2026-01-01T00:00:00Z',
        tags: [{ id: 't1', slug: 'ai', name: 'AI' }],
      }
      const rpc = mockRpc({ data: [row], count: 1 })
      const lf = createClientFromRpc(rpc)
      const results = await lf.lenses.browse()
      expect(results).toHaveLength(1)
      expect(results[0]).toMatchObject({
        id: 'lens-1',
        title: 'Test Lens',
        visibility: 'public',
        status: 'published',
        createdAt: '2026-01-01T00:00:00Z',
        author: { handle: 'alice', displayName: 'alice' },
      })
    })

    it('throws on error', async () => {
      const lf = createClientFromRpc(errorRpc())
      await expect(lf.lenses.browse()).rejects.toThrowError(/fn_mcp_lens_list failed/)
    })
  })

  describe('search', () => {
    it('delegates to browse with search param, calling fn_mcp_lens_search', async () => {
      const rpc = mockRpc({ data: [], count: 0 })
      const lf = createClientFromRpc(rpc)
      await lf.lenses.search('hello world', { status: 'published' })
      const [fn, params] = (rpc.rpc as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>]
      expect(fn).toBe('fn_mcp_lens_search')
      expect(params['p_query']).toBe('hello world')
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

  describe('extractParams', () => {
    it('returns the contracts and their labels', async () => {
      const rpc = mockRpc({
        input_contract: {
          parameters: [
            { label: 'Topic', required: true },
            { label: 'Tone', required: false },
          ],
        },
      })
      const lf = createClientFromRpc(rpc)
      const result = await lf.lenses.extractParams('v1')
      expect(rpc.rpc).toHaveBeenCalledWith('fn_get_version_contracts', { p_version_id: 'v1' })
      expect(result.labels).toEqual(['Topic', 'Tone'])
      expect(result.params).toHaveLength(2)
    })
  })

  describe('validateParams', () => {
    const contractsRpc = () =>
      mockRpc({
        input_contract: {
          parameters: [
            { label: 'Topic', required: true },
            { label: 'Tone', required: false },
          ],
        },
      })

    it('reports missing required params', async () => {
      const lf = createClientFromRpc(contractsRpc())
      const result = await lf.lenses.validateParams('v1', {})
      expect(result).toMatchObject({ valid: false, missing: ['Topic'], unknown: [] })
    })

    it('is valid when required params are present (case-insensitive)', async () => {
      const lf = createClientFromRpc(contractsRpc())
      const result = await lf.lenses.validateParams('v1', { topic: 'AI' })
      expect(result.valid).toBe(true)
      expect(result.missing).toEqual([])
    })

    it('flags unknown keys', async () => {
      const lf = createClientFromRpc(contractsRpc())
      const result = await lf.lenses.validateParams('v1', { Topic: 'AI', bogus: 'x' })
      expect(result).toMatchObject({ valid: false, missing: [], unknown: ['bogus'] })
    })
  })

  describe('getVersion', () => {
    const detailRow = {
      id: 'v1',
      lens_id: 'l1',
      version_number: 2,
      status: 'published',
      template_body: 'Hello [[:p1]]',
      changelog: 'Initial',
      published_at: '2026-01-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
    }
    const paramRow = {
      id: 'p1',
      label: 'topic',
      tool_id: 't1',
      optional: false,
      tool: {
        id: 't1', key: 'text', label: 'Short Text', description: null, category: 'input',
        type: 'text', required: true, placeholder: 'Enter text...', help_text: 'A brief value.',
        validation_schema: null, options: null,
        icon: 'type', color: '#6366f1', is_system: true, max_length: 500, min_length: 1, sort_order: 0,
      },
    }

    function makeVersionRpc() {
      return {
        rpc: vi.fn(async (fn: string) => {
          if (fn === 'fn_get_lens_version_detail') return { data: [detailRow], error: null }
          return { data: [paramRow], error: null }
        }),
      } as SupabaseLikeRpcClient
    }

    it('calls both RPCs with the version id', async () => {
      const rpc = makeVersionRpc()
      await createClientFromRpc(rpc).lenses.getVersion('v1')
      expect(rpc.rpc).toHaveBeenCalledWith('fn_get_lens_version_detail', { p_version_id: 'v1' })
      expect(rpc.rpc).toHaveBeenCalledWith('fn_get_lens_version_parameters', { p_version_id: 'v1' })
    })

    it('maps snake_case version fields to camelCase', async () => {
      const result = await createClientFromRpc(makeVersionRpc()).lenses.getVersion('v1')
      expect(result).not.toBeNull()
      expect(result!.lensId).toBe('l1')
      expect(result!.versionNumber).toBe(2)
      expect(result!.templateBody).toBe('Hello [[:p1]]')
      expect(result!.publishedAt).toBe('2026-01-01T00:00:00Z')
      expect(result!.createdAt).toBe('2026-01-01T00:00:00Z')
      expect(result!.parameterCount).toBe(1)
    })

    it('maps parameters and tool fields to camelCase', async () => {
      const result = await createClientFromRpc(makeVersionRpc()).lenses.getVersion('v1')
      expect(result!.parameters).toHaveLength(1)
      const param = result!.parameters[0]
      expect(param.toolId).toBe('t1')
      expect(param.optional).toBe(false)
      expect(param.tool).not.toBeNull()
      expect(param.tool!.key).toBe('text')
      expect(param.tool!.helpText).toBe('A brief value.')
      expect(param.tool!.isSystem).toBe(true)
      expect(param.tool!.maxLength).toBe(500)
      expect(param.tool!.minLength).toBe(1)
      expect(param.tool!.sortOrder).toBe(0)
      expect(param.tool!.icon).toBe('type')
      expect(param.tool!.color).toBe('#6366f1')
    })

    it('returns null when detail RPC returns empty array', async () => {
      const rpc: SupabaseLikeRpcClient = {
        rpc: vi.fn(async (fn: string) => {
          if (fn === 'fn_get_lens_version_detail') return { data: [], error: null }
          return { data: [], error: null }
        }),
      }
      expect(await createClientFromRpc(rpc).lenses.getVersion('v1')).toBeNull()
    })

    it('throws when params RPC errors', async () => {
      const rpc: SupabaseLikeRpcClient = {
        rpc: vi.fn(async (fn: string) => {
          if (fn === 'fn_get_lens_version_detail') return { data: [detailRow], error: null }
          return { data: null, error: { message: 'denied' } }
        }),
      }
      await expect(createClientFromRpc(rpc).lenses.getVersion('v1')).rejects.toThrowError(
        /fn_get_lens_version_parameters failed/,
      )
    })
  })

  describe('getLatestVersion', () => {
    it('resolves head_version_id via fn_get_lens_detail_bootstrap then calls getVersion', async () => {
      const rpc: SupabaseLikeRpcClient = {
        rpc: vi.fn(async (fn: string) => {
          if (fn === 'fn_get_lens_detail_bootstrap')
            return { data: { id: 'l1', head_version_id: 'v1' }, error: null }
          if (fn === 'fn_get_lens_version_detail')
            return { data: [{ id: 'v1', lens_id: 'l1', version_number: 1, status: 'draft', template_body: 'T', changelog: null, published_at: null, created_at: '2026-01-01T00:00:00Z' }], error: null }
          return { data: [], error: null }
        }),
      }
      const result = await createClientFromRpc(rpc).lenses.getLatestVersion('l1')
      expect(result).not.toBeNull()
      expect(result!.id).toBe('v1')
      expect(rpc.rpc).toHaveBeenCalledWith('fn_get_lens_detail_bootstrap', { p_lens_id: 'l1' })
      expect(rpc.rpc).toHaveBeenCalledWith('fn_get_lens_version_detail', { p_version_id: 'v1' })
    })

    it('returns null when bootstrap returns error', async () => {
      const rpc = mockRpc({ error: 'not_found' })
      expect(await createClientFromRpc(rpc).lenses.getLatestVersion('missing')).toBeNull()
    })

    it('returns null when lens has no head_version_id', async () => {
      const rpc = mockRpc({ id: 'l1', head_version_id: null })
      expect(await createClientFromRpc(rpc).lenses.getLatestVersion('l1')).toBeNull()
    })
  })
})
