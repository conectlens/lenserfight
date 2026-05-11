import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc, mockFrom, chainMethods } = vi.hoisted(() => {
  const chainMethods: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
  }
  Object.values(chainMethods).forEach((m) => m.mockReturnValue(chainMethods))
  return {
    mockRpc: vi.fn(),
    mockFrom: vi.fn().mockReturnValue(chainMethods),
    chainMethods,
  }
})

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
  },
}))

import { SupabaseSocialLinksRepository } from './socialLinksRepository'

const HANDLE = 'alice'

const rawLink = { id: 'link-1', lenser_id: 'lenser-1', platform: 'twitter', url: 'https://twitter.com/alice', label: 'Twitter', created_at: '2026-01-01T00:00:00Z' }

describe('SupabaseSocialLinksRepository', () => {
  let repo: SupabaseSocialLinksRepository

  beforeEach(() => {
    repo = new SupabaseSocialLinksRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(chainMethods)
    Object.values(chainMethods).forEach((m) => m.mockReturnValue(chainMethods))
    chainMethods.eq.mockResolvedValue({ data: [], error: null })
  })

  // ---------------------------------------------------------------------------
  // getLinks (owner view)
  // ---------------------------------------------------------------------------
  describe('getLinks', () => {
    it('queries vw_lensers_social_links_private by handle', async () => {
      chainMethods.eq.mockResolvedValue({ data: [rawLink], error: null })
      const result = await repo.getLinks(HANDLE)
      expect(mockFrom).toHaveBeenCalledWith('vw_lensers_social_links_private')
      expect(chainMethods.eq).toHaveBeenCalledWith('handle', HANDLE)
      expect(result).toEqual([rawLink])
    })

    it('returns empty array when no links', async () => {
      chainMethods.eq.mockResolvedValue({ data: [], error: null })
      expect(await repo.getLinks(HANDLE)).toEqual([])
    })

    it('rethrows errors', async () => {
      chainMethods.eq.mockResolvedValue({ data: null, error: new Error('access denied') })
      await expect(repo.getLinks(HANDLE)).rejects.toThrow('access denied')
    })
  })

  // ---------------------------------------------------------------------------
  // getLinksByHandle (public view)
  // ---------------------------------------------------------------------------
  describe('getLinksByHandle', () => {
    it('queries vw_lensers_social_links_public selecting platform, url, label', async () => {
      const publicRow = { platform: 'twitter', url: 'https://twitter.com/alice', label: 'Twitter' }
      chainMethods.eq.mockResolvedValue({ data: [publicRow], error: null })
      const result = await repo.getLinksByHandle(HANDLE)
      expect(mockFrom).toHaveBeenCalledWith('vw_lensers_social_links_public')
      expect(chainMethods.select).toHaveBeenCalledWith('platform, url, label')
      expect(result[0].platform).toBe('twitter')
    })

    it('assigns synthetic id and lenser_id="public"', async () => {
      const publicRow = { platform: 'github', url: 'https://github.com/alice', label: null }
      chainMethods.eq.mockResolvedValue({ data: [publicRow], error: null })
      const result = await repo.getLinksByHandle(HANDLE)
      expect(result[0].id).toBe('public-link-0')
      expect(result[0].lenser_id).toBe('public')
    })

    it('returns empty array when no links', async () => {
      chainMethods.eq.mockResolvedValue({ data: null, error: null })
      expect(await repo.getLinksByHandle(HANDLE)).toEqual([])
    })

    it('rethrows errors', async () => {
      chainMethods.eq.mockResolvedValue({ data: null, error: new Error('not found') })
      await expect(repo.getLinksByHandle(HANDLE)).rejects.toThrow('not found')
    })
  })

  // ---------------------------------------------------------------------------
  // syncLinks
  // ---------------------------------------------------------------------------
  describe('syncLinks', () => {
    it('calls fn_lensers_sync_social_links with minimal payload', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      chainMethods.eq.mockResolvedValue({ data: [rawLink], error: null })
      const links = [{ platform: 'twitter' as const, url: 'https://twitter.com/alice', label: 'Twitter' }]
      await repo.syncLinks(HANDLE, links)
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_sync_social_links', {
        p_links: [{ id: null, platform: 'twitter', url: 'https://twitter.com/alice', label: 'Twitter' }],
      })
    })

    it('includes id in payload when provided', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      chainMethods.eq.mockResolvedValue({ data: [rawLink], error: null })
      const links = [{ id: 'link-1', platform: 'github' as const, url: 'https://github.com/alice', label: null as any }]
      await repo.syncLinks(HANDLE, links)
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_sync_social_links', expect.objectContaining({
        p_links: [expect.objectContaining({ id: 'link-1' })],
      }))
    })

    it('reloads links from private view after sync', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      chainMethods.eq.mockResolvedValue({ data: [rawLink], error: null })
      const result = await repo.syncLinks(HANDLE, [])
      expect(mockFrom).toHaveBeenCalledWith('vw_lensers_social_links_private')
      expect(result).toEqual([rawLink])
    })

    it('rethrows RPC errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('sync error') })
      await expect(repo.syncLinks(HANDLE, [])).rejects.toThrow('sync error')
    })
  })
})
