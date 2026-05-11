import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { SupabaseShareRepository } from './shareRepository'

const SHORT_ID = 'abc123'
const RESOURCE_ID = 'resource-uuid-1'

describe('SupabaseShareRepository', () => {
  let repo: SupabaseShareRepository

  beforeEach(() => {
    repo = new SupabaseShareRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---------------------------------------------------------------------------
  // createOrGetSharedLink
  // ---------------------------------------------------------------------------
  describe('createOrGetSharedLink', () => {
    it('calls fn_analytics_shared_links_create with all dto fields', async () => {
      const link = { id: 'link-1', short_id: SHORT_ID }
      mockRpc.mockResolvedValue({ data: link, error: null })
      const result = await repo.createOrGetSharedLink({
        resourceType: 'lens',
        resourceId: RESOURCE_ID,
        slug: 'my-lens',
        channel: 'social',
        meta: { note: 'test' },
        displayName: 'My Lens',
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_analytics_shared_links_create', {
        p_resource_type: 'lens',
        p_resource_id: RESOURCE_ID,
        p_slug: 'my-lens',
        p_channel: 'social',
        p_meta: { note: 'test' },
        p_display_name: 'My Lens',
      })
      expect(result).toEqual(link)
    })

    it('uses defaults for optional fields', async () => {
      mockRpc.mockResolvedValue({ data: {}, error: null })
      await repo.createOrGetSharedLink({ resourceType: 'lens', resourceId: RESOURCE_ID })
      expect(mockRpc).toHaveBeenCalledWith('fn_analytics_shared_links_create', expect.objectContaining({
        p_slug: null,
        p_channel: 'in_app',
        p_meta: {},
        p_display_name: null,
      }))
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('create error') })
      await expect(repo.createOrGetSharedLink({ resourceType: 'lens', resourceId: RESOURCE_ID })).rejects.toThrow('create error')
    })
  })

  // ---------------------------------------------------------------------------
  // resolveLink — maps resource_type to URL path
  // ---------------------------------------------------------------------------
  describe('resolveLink', () => {
    it('calls fn_analytics_shared_links_get with p_short_id', async () => {
      mockRpc.mockResolvedValue({ data: { resource_type: 'lens', resource_id: RESOURCE_ID, slug: null, meta: {} }, error: null })
      await repo.resolveLink(SHORT_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_analytics_shared_links_get', { p_short_id: SHORT_ID })
    })

    it('maps external resource_type to targetUrl from meta', async () => {
      mockRpc.mockResolvedValue({ data: { resource_type: 'external', resource_id: RESOURCE_ID, slug: null, meta: { targetUrl: 'https://example.com' } }, error: null })
      const result = await repo.resolveLink(SHORT_ID)
      expect(result?.url).toBe('https://example.com')
    })

    it('falls back to resource_id when external link has no targetUrl', async () => {
      mockRpc.mockResolvedValue({ data: { resource_type: 'external', resource_id: RESOURCE_ID, slug: null, meta: {} }, error: null })
      const result = await repo.resolveLink(SHORT_ID)
      expect(result?.url).toBe(RESOURCE_ID)
    })

    it('maps lens resource_type to /lenses/:slug', async () => {
      mockRpc.mockResolvedValue({ data: { resource_type: 'lens', resource_id: RESOURCE_ID, slug: 'my-lens', meta: {} }, error: null })
      const result = await repo.resolveLink(SHORT_ID)
      expect(result?.url).toBe('/lenses/my-lens')
    })

    it('maps lens resource_type to /lenses/:resource_id when no slug', async () => {
      mockRpc.mockResolvedValue({ data: { resource_type: 'lens', resource_id: RESOURCE_ID, slug: null, meta: {} }, error: null })
      const result = await repo.resolveLink(SHORT_ID)
      expect(result?.url).toBe(`/lenses/${RESOURCE_ID}`)
    })

    it('maps thread resource_type to /threads/:resource_id', async () => {
      mockRpc.mockResolvedValue({ data: { resource_type: 'thread', resource_id: RESOURCE_ID, slug: null, meta: {} }, error: null })
      const result = await repo.resolveLink(SHORT_ID)
      expect(result?.url).toBe(`/threads/${RESOURCE_ID}`)
    })

    it('maps profile resource_type to /lenser/:slug', async () => {
      mockRpc.mockResolvedValue({ data: { resource_type: 'profile', resource_id: RESOURCE_ID, slug: 'alice', meta: {} }, error: null })
      const result = await repo.resolveLink(SHORT_ID)
      expect(result?.url).toBe('/lenser/alice')
    })

    it('returns "/" for unknown resource_type', async () => {
      mockRpc.mockResolvedValue({ data: { resource_type: 'unknown', resource_id: RESOURCE_ID, slug: null, meta: {} }, error: null })
      const result = await repo.resolveLink(SHORT_ID)
      expect(result?.url).toBe('/')
    })

    it('returns null when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.resolveLink(SHORT_ID)).toBeNull()
    })

    it('returns null on Supabase error (silently swallowed)', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('not found') })
      expect(await repo.resolveLink(SHORT_ID)).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // logEvent
  // ---------------------------------------------------------------------------
  describe('logEvent', () => {
    it('calls fn_analytics_share_events_log with all fields', async () => {
      await repo.logEvent(SHORT_ID, 'opened', {
        ip_hash: 'hash123',
        user_agent: 'Mozilla/5.0',
        referer: 'https://google.com',
        country: 'TR',
        city: 'Istanbul',
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_analytics_share_events_log', {
        p_short_id: SHORT_ID,
        p_event_type: 'opened',
        p_ip_hash: 'hash123',
        p_user_agent: 'Mozilla/5.0',
        p_referer: 'https://google.com',
        p_country: 'TR',
        p_city: 'Istanbul',
      })
    })

    it('passes null for absent viewer fields', async () => {
      await repo.logEvent(SHORT_ID, 'opened')
      expect(mockRpc).toHaveBeenCalledWith('fn_analytics_share_events_log', expect.objectContaining({
        p_ip_hash: null,
        p_user_agent: null,
        p_referer: null,
        p_country: null,
        p_city: null,
      }))
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('log error') })
      await expect(repo.logEvent(SHORT_ID, 'opened')).rejects.toThrow('log error')
    })
  })
})
