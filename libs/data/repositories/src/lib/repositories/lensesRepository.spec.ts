import { describe, expect, it, vi, beforeEach } from 'vitest'

// Chain builder mock for supabase.from() queries
const { mockRpc, mockFrom, chainMethods } = vi.hoisted(() => {
  const chainMethods: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    eq: vi.fn(),
    ilike: vi.fn(),
    maybeSingle: vi.fn(),
    in: vi.fn(),
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

import { SupabaseLensesRepository } from './lensesRepository'

const LENS_ID = '00000000-0000-0000-0000-000000000001'
const LENSER_ID = 'lenser-uuid-1'
const VERSION_ID = '00000000-0000-0000-0000-000000000002'

const rawLens = {
  id: LENS_ID,
  lenser_id: LENSER_ID,
  title: 'My Lens',
  description: 'A test lens',
  visibility: 'public',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  author_profile: { id: LENSER_ID, handle: 'alice', display_name: 'Alice', avatar_url: null },
  tags: [],
  reaction_totals: {},
}

const rawVersion = {
  id: VERSION_ID,
  lens_id: LENS_ID,
  version_number: 1,
  template_body: 'Hello {{name}}',
  status: 'published',
  changelog: null,
  parent_version_id: null,
  published_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  parameter_count: 1,
}

describe('SupabaseLensesRepository', () => {
  let repo: SupabaseLensesRepository

  beforeEach(() => {
    repo = new SupabaseLensesRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(chainMethods)
    Object.values(chainMethods).forEach((m) => m.mockReturnValue(chainMethods))
    chainMethods.range.mockResolvedValue({ data: [], error: null })
    chainMethods.maybeSingle.mockResolvedValue({ data: null, error: null })
    chainMethods.in.mockResolvedValue({ data: [], error: null })
  })

  // ---------------------------------------------------------------------------
  // handleError behavior
  // ---------------------------------------------------------------------------
  describe('handleError (via getById)', () => {
    it('throws "Requested resource was not found." on PGRST116', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'not found' } })
      await expect(repo.getById(LENS_ID)).rejects.toThrow('Requested resource was not found.')
    })

    it('throws permission denied message on 42501', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'permission denied' },
      })
      await expect(repo.getById(LENS_ID)).rejects.toThrow(
        'This lens or its associated data is private or hidden and cannot be accessed.'
      )
    })

    it('throws permission denied message when message includes "permission denied"', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: '500', message: 'permission denied for table' },
      })
      await expect(repo.getById(LENS_ID)).rejects.toThrow(
        'This lens or its associated data is private or hidden and cannot be accessed.'
      )
    })
  })

  // ---------------------------------------------------------------------------
  // getAll
  // ---------------------------------------------------------------------------
  describe('getAll', () => {
    it('queries vw_lenses_public with order and range', async () => {
      chainMethods.range.mockResolvedValue({ data: [rawLens], error: null })
      await repo.getAll(0, 10)
      expect(mockFrom).toHaveBeenCalledWith('vw_lenses_public')
      expect(chainMethods.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(chainMethods.range).toHaveBeenCalledWith(0, 9)
    })

    it('applies offset and limit to range', async () => {
      chainMethods.range.mockResolvedValue({ data: [], error: null })
      await repo.getAll(20, 5)
      expect(chainMethods.range).toHaveBeenCalledWith(20, 24)
    })

    it('returns paginatedResponse envelope', async () => {
      chainMethods.range.mockResolvedValue({ data: [rawLens], error: null })
      const result = await repo.getAll()
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('meta')
    })

    it('rethrows errors', async () => {
      chainMethods.range.mockResolvedValue({ data: null, error: new Error('getAll error') })
      await expect(repo.getAll()).rejects.toThrow('getAll error')
    })
  })

  // ---------------------------------------------------------------------------
  // search
  // ---------------------------------------------------------------------------
  describe('search', () => {
    it('queries vw_lenses_public with ilike on title', async () => {
      chainMethods.range.mockResolvedValue({ data: [], error: null })
      await repo.search('test')
      expect(mockFrom).toHaveBeenCalledWith('vw_lenses_public')
      expect(chainMethods.ilike).toHaveBeenCalledWith('title', '%test%')
    })

    it('also queries fn_list_my_private_lenses when ownerId provided', async () => {
      chainMethods.range.mockResolvedValue({ data: [], error: null })
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.search('test', 0, 10, LENSER_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_my_private_lenses', {
        p_limit: 10,
        p_cursor: null,
      })
    })

    it('does not call fn_list_my_private_lenses when ownerId absent', async () => {
      chainMethods.range.mockResolvedValue({ data: [], error: null })
      await repo.search('test')
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('returns paginatedResponse envelope', async () => {
      chainMethods.range.mockResolvedValue({ data: [], error: null })
      const result = await repo.search('query')
      expect(result).toHaveProperty('data')
    })
  })

  // ---------------------------------------------------------------------------
  // filterByTag
  // ---------------------------------------------------------------------------
  describe('filterByTag', () => {
    it('delegates to getAll (queries vw_lenses_public) when tagSlug is null', async () => {
      chainMethods.range.mockResolvedValue({ data: [], error: null })
      await repo.filterByTag(null)
      expect(mockFrom).toHaveBeenCalledWith('vw_lenses_public')
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('calls fn_content_get_lenses_by_tag when tagSlug is provided', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.filterByTag('python', 'newest', 0, 20)
      expect(mockRpc).toHaveBeenCalledWith('fn_content_get_lenses_by_tag', {
        p_tag_slug: 'python',
        p_sort: 'newest',
        p_limit: 20,
        p_offset: 0,
      })
    })

    it('rethrows errors from tag RPC', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('tag error') })
      await expect(repo.filterByTag('python')).rejects.toThrow('tag error')
    })
  })

  // ---------------------------------------------------------------------------
  // sort
  // ---------------------------------------------------------------------------
  describe('sort', () => {
    it('queries vw_lenses_public for newest sort', async () => {
      chainMethods.range.mockResolvedValue({ data: [], error: null })
      await repo.sort('newest')
      expect(mockFrom).toHaveBeenCalledWith('vw_lenses_public')
      expect(chainMethods.order).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('calls fn_content_get_popular_lenses for popular sort', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.sort('popular', 0, 20)
      expect(mockRpc).toHaveBeenCalledWith('fn_content_get_popular_lenses', {
        p_limit: 20,
        p_offset: 0,
      })
    })
  })

  // ---------------------------------------------------------------------------
  // getTopLenses
  // ---------------------------------------------------------------------------
  describe('getTopLenses', () => {
    it('calls fn_content_get_popular_lenses with offset 0', async () => {
      mockRpc.mockResolvedValue({ data: [rawLens], error: null })
      const result = await repo.getTopLenses(5)
      expect(mockRpc).toHaveBeenCalledWith('fn_content_get_popular_lenses', {
        p_limit: 5,
        p_offset: 0,
      })
      expect(result).toEqual([rawLens])
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getTopLenses(5)).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // getTrendingLenses
  // ---------------------------------------------------------------------------
  describe('getTrendingLenses', () => {
    it('calls fn_content_get_trending_lenses with defaults', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getTrendingLenses()
      expect(mockRpc).toHaveBeenCalledWith('fn_content_get_trending_lenses', {
        p_lang: null,
        p_limit: 20,
        p_offset: 0,
      })
    })

    it('passes lang when provided', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getTrendingLenses('en', 0, 10)
      expect(mockRpc).toHaveBeenCalledWith(
        'fn_content_get_trending_lenses',
        expect.objectContaining({ p_lang: 'en' })
      )
    })

    it('maps author_profile and reaction_totals to LensViewModel shape', async () => {
      const raw = [
        {
          id: LENS_ID,
          title: 'My Lens',
          description: null,
          author_profile: {
            id: LENSER_ID,
            display_name: 'Alice',
            handle: 'alice',
            avatar_url: null,
          },
          reaction_totals: { copy: 5 },
          tags: [],
          created_at: '2026-01-01T00:00:00Z',
        },
      ]
      mockRpc.mockResolvedValue({ data: raw, error: null })
      const result = await repo.getTrendingLenses()
      const [item] = result.data
      expect(item.author.displayName).toBe('Alice')
      expect(item.usageCount).toBe(5)
    })
  })

  // ---------------------------------------------------------------------------
  // getPersonalFeed
  // ---------------------------------------------------------------------------
  describe('getPersonalFeed', () => {
    it('calls fn_content_get_personal_lenses with default limit and offset', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getPersonalFeed()
      expect(mockRpc).toHaveBeenCalledWith('fn_content_get_personal_lenses', {
        p_limit: 20,
        p_offset: 0,
      })
    })

    it('maps personalScore and primaryLanguage from row', async () => {
      const raw = [
        {
          id: LENS_ID,
          title: 'Test',
          description: null,
          author_profile: {},
          reaction_totals: {},
          tags: [],
          created_at: '2026-01-01T00:00:00Z',
          hot_score: 0.8,
          primary_language: 'en',
          personal_score: 0.9,
        },
      ]
      mockRpc.mockResolvedValue({ data: raw, error: null })
      const result = await repo.getPersonalFeed()
      const [item] = result.data as any[]
      expect(item.personalScore).toBe(0.9)
      expect(item.primaryLanguage).toBe('en')
    })
  })

  // ---------------------------------------------------------------------------
  // getFollowingFeed
  // ---------------------------------------------------------------------------
  describe('getFollowingFeed', () => {
    it('calls fn_content_get_following_lenses with p_lenser_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getFollowingFeed(LENSER_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_content_get_following_lenses', {
        p_lenser_id: LENSER_ID,
        p_limit: 20,
        p_offset: 0,
      })
    })
  })

  // ---------------------------------------------------------------------------
  // getMyLenses
  // ---------------------------------------------------------------------------
  describe('getMyLenses', () => {
    it('calls fn_get_my_lenses with default offset 0 and limit 20', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getMyLenses()
      expect(mockRpc).toHaveBeenCalledWith('fn_get_my_lenses', { p_offset: 0, p_limit: 20 })
    })
  })

  // ---------------------------------------------------------------------------
  // getByLenser
  // ---------------------------------------------------------------------------
  describe('getByLenser', () => {
    it('queries vw_lenses_public with eq(lenser_handle) for non-private', async () => {
      chainMethods.range.mockResolvedValue({ data: [rawLens], error: null })
      await repo.getByLenser('alice')
      expect(mockFrom).toHaveBeenCalledWith('vw_lenses_public')
      expect(chainMethods.eq).toHaveBeenCalledWith('lenser_handle', 'alice')
    })

    it('calls fn_list_my_private_lenses when includePrivate=true', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getByLenser('alice', 0, 10, true)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_my_private_lenses', {
        p_limit: 10,
        p_cursor: null,
      })
    })
  })

  // ---------------------------------------------------------------------------
  // getById
  // ---------------------------------------------------------------------------
  describe('getById', () => {
    it('returns null immediately for non-UUID id', async () => {
      const result = await repo.getById('not-a-uuid')
      expect(mockRpc).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })

    it('returns null for empty string id', async () => {
      expect(await repo.getById('')).toBeNull()
    })

    it('calls fn_get_lens_detail_bootstrap with valid UUID', async () => {
      mockRpc.mockResolvedValue({
        data: {
          id: LENS_ID,
          error: null,
          lenser_id: LENSER_ID,
          visibility: 'public',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          title: 'T',
          description: null,
          content: '',
          author_profile: {},
          tags: [],
          reaction_totals: {},
          latest_published_version: null,
        },
        error: null,
      })
      await repo.getById(LENS_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_lens_detail_bootstrap', { p_lens_id: LENS_ID })
    })

    it('returns null when data has error: "not_found"', async () => {
      mockRpc.mockResolvedValue({ data: { error: 'not_found' }, error: null })
      expect(await repo.getById(LENS_ID)).toBeNull()
    })

    it('returns null when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getById(LENS_ID)).toBeNull()
    })

    it('maps author_profile from bootstrap data', async () => {
      const bootstrapData = {
        id: LENS_ID,
        lenser_id: LENSER_ID,
        visibility: 'public',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        title: 'My Lens',
        description: null,
        content: '',
        tags: [],
        reaction_totals: {},
        author_profile: { id: LENSER_ID, handle: 'alice', display_name: 'Alice', avatar_url: null },
        latest_published_version: null,
      }
      mockRpc.mockResolvedValue({ data: bootstrapData, error: null })
      const result = await repo.getById(LENS_ID)
      expect(result?.author_profile.handle).toBe('alice')
    })
  })

  // ---------------------------------------------------------------------------
  // getTags
  // ---------------------------------------------------------------------------
  describe('getTags', () => {
    it('queries vw_lenses_public for tags by id', async () => {
      chainMethods.maybeSingle.mockResolvedValue({
        data: { tags: [{ id: 't-1', slug: 'python', name: 'Python' }] },
        error: null,
      })
      const result = await repo.getTags(LENS_ID)
      expect(mockFrom).toHaveBeenCalledWith('vw_lenses_public')
      expect(chainMethods.select).toHaveBeenCalledWith('tags')
      expect(chainMethods.eq).toHaveBeenCalledWith('id', LENS_ID)
      expect(result).toEqual([{ id: 't-1', slug: 'python', name: 'Python' }])
    })

    it('returns empty array on Supabase error (silently swallowed)', async () => {
      chainMethods.maybeSingle.mockResolvedValue({ data: null, error: new Error('tag error') })
      expect(await repo.getTags(LENS_ID)).toEqual([])
    })

    it('returns empty array when data is null', async () => {
      chainMethods.maybeSingle.mockResolvedValue({ data: null, error: null })
      expect(await repo.getTags(LENS_ID)).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // createLens
  // ---------------------------------------------------------------------------
  describe('createLens', () => {
    beforeEach(() => {
      // First rpc call: fn_lensers_get_active_profile
      // Second rpc call: fn_create_lens
      mockRpc
        .mockResolvedValueOnce({ data: { language: 'tr' }, error: null })
        .mockResolvedValueOnce({ data: LENS_ID, error: null })
      chainMethods.maybeSingle.mockResolvedValue({ data: rawLens, error: null })
    })

    it('calls fn_lensers_get_active_profile then fn_create_lens', async () => {
      await repo.createLens({ title: 'New', content: 'body', visibility: 'public' })
      expect(mockRpc.mock.calls[0][0]).toBe('fn_lensers_get_active_profile')
      expect(mockRpc.mock.calls[1][0]).toBe('fn_create_lens')
    })

    it('uses language from authenticated profile', async () => {
      await repo.createLens({ title: 'New', content: 'body', visibility: 'public' })
      expect(mockRpc.mock.calls[1][1]).toMatchObject({ p_language_code: 'tr' })
    })

    it('defaults to "en" when profile language absent', async () => {
      mockRpc.mockReset()
      mockRpc
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: LENS_ID, error: null })
      await repo.createLens({ title: 'New', content: 'body', visibility: 'public' })
      expect(mockRpc.mock.calls[1][1]).toMatchObject({ p_language_code: 'en' })
    })

    it('passes null for optional fields', async () => {
      await repo.createLens({ title: 'New', content: 'body', visibility: 'public' })
      expect(mockRpc.mock.calls[1][1]).toMatchObject({
        p_description: null,
        p_params: [],
        p_tag_ids: [],
        p_parent_lens_id: null,
        p_forked_from_execution_id: null,
      })
    })

    it('returns fallback record when lens is private (not in public view)', async () => {
      mockRpc.mockReset()
      mockRpc
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: LENS_ID, error: null })
      chainMethods.maybeSingle.mockResolvedValue({ data: null, error: null })
      const result = await repo.createLens({
        title: 'Private',
        content: 'body',
        visibility: 'private',
      })
      expect(result.id).toBe(LENS_ID)
      expect(result.visibility).toBe('private')
    })
  })

  // ---------------------------------------------------------------------------
  // updateLens
  // ---------------------------------------------------------------------------
  describe('updateLens', () => {
    it('calls fn_update_lens then reads from vw_lenses_public', async () => {
      mockRpc.mockResolvedValue({ error: null })
      chainMethods.maybeSingle.mockResolvedValue({ data: rawLens, error: null })
      await repo.updateLens(LENS_ID, { title: 'Updated' })
      expect(mockRpc).toHaveBeenCalledWith(
        'fn_update_lens',
        expect.objectContaining({ p_lens_id: LENS_ID, p_title: 'Updated' })
      )
      expect(mockFrom).toHaveBeenCalledWith('vw_lenses_public')
    })

    it('returns fallback record when updated lens is private', async () => {
      mockRpc.mockResolvedValue({ error: null })
      chainMethods.maybeSingle.mockResolvedValue({ data: null, error: null })
      const result = await repo.updateLens(LENS_ID, { title: 'Private', visibility: 'private' })
      expect(result.id).toBe(LENS_ID)
    })

    it('passes null for absent optional fields', async () => {
      mockRpc.mockResolvedValue({ error: null })
      chainMethods.maybeSingle.mockResolvedValue({ data: rawLens, error: null })
      await repo.updateLens(LENS_ID, {})
      expect(mockRpc).toHaveBeenCalledWith(
        'fn_update_lens',
        expect.objectContaining({
          p_template_body: null,
          p_visibility: null,
          p_title: null,
        })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // deleteLens
  // ---------------------------------------------------------------------------
  describe('deleteLens', () => {
    it('calls fn_delete_lens with p_lens_id', async () => {
      await repo.deleteLens(LENS_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_delete_lens', { p_lens_id: LENS_ID })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('delete error') })
      await expect(repo.deleteLens(LENS_ID)).rejects.toThrow('delete error')
    })
  })

  // ---------------------------------------------------------------------------
  // getVersions
  // ---------------------------------------------------------------------------
  describe('getVersions', () => {
    it('calls fn_list_lens_versions with p_include_archived=false', async () => {
      mockRpc.mockResolvedValue({ data: [rawVersion], error: null })
      const result = await repo.getVersions(LENS_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_lens_versions', {
        p_lens_id: LENS_ID,
        p_include_archived: false,
      })
      expect(result[0].lensId).toBe(LENS_ID)
      expect(result[0].versionNumber).toBe(1)
      expect(result[0].templateBody).toBe('Hello {{name}}')
    })

    it('maps all LensVersion fields correctly', async () => {
      mockRpc.mockResolvedValue({ data: [rawVersion], error: null })
      const [v] = await repo.getVersions(LENS_ID)
      expect(v.id).toBe(VERSION_ID)
      expect(v.status).toBe('published')
      expect(v.changelog).toBeNull()
      expect(v.parentVersionId).toBeNull()
      expect(v.publishedAt).toBe('2026-01-01T00:00:00Z')
      expect(v.parameterCount).toBe(1)
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getVersions(LENS_ID)).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // getVersionsPaginated
  // ---------------------------------------------------------------------------
  describe('getVersionsPaginated', () => {
    it('slices results by offset and limit client-side', async () => {
      const rows = [
        { ...rawVersion, id: 'v-1', version_number: 1 },
        { ...rawVersion, id: 'v-2', version_number: 2 },
        { ...rawVersion, id: 'v-3', version_number: 3 },
      ]
      mockRpc.mockResolvedValue({ data: rows, error: null })
      const result = await repo.getVersionsPaginated(LENS_ID, 2, 1)
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('v-2')
    })

    it('omits templateBody (returns empty string)', async () => {
      mockRpc.mockResolvedValue({ data: [rawVersion], error: null })
      const [v] = await repo.getVersionsPaginated(LENS_ID, 10, 0)
      expect(v.templateBody).toBe('')
    })
  })

  // ---------------------------------------------------------------------------
  // getVersionById
  // ---------------------------------------------------------------------------
  describe('getVersionById', () => {
    it('calls fn_get_lens_version_detail then fn_get_lens_version_parameters', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: [rawVersion], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
      const result = await repo.getVersionById(VERSION_ID)
      expect(mockRpc.mock.calls[0]).toEqual([
        'fn_get_lens_version_detail',
        { p_version_id: VERSION_ID },
      ])
      expect(mockRpc.mock.calls[1]).toEqual([
        'fn_get_lens_version_parameters',
        { p_version_id: VERSION_ID },
      ])
      expect(result?.id).toBe(VERSION_ID)
    })

    it('returns null when version not found', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getVersionById(VERSION_ID)).toBeNull()
    })

    it('handles non-array data response from first RPC', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: rawVersion, error: null })
        .mockResolvedValueOnce({ data: [], error: null })
      expect(await repo.getVersionById(VERSION_ID)).not.toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // getLatestVersionId
  // ---------------------------------------------------------------------------
  describe('getLatestVersionId', () => {
    it('returns ID of version with highest version_number', async () => {
      mockRpc.mockResolvedValue({
        data: [
          { id: 'v-1', version_number: 1 },
          { id: 'v-3', version_number: 3 },
          { id: 'v-2', version_number: 2 },
        ],
        error: null,
      })
      expect(await repo.getLatestVersionId(LENS_ID)).toBe('v-3')
    })

    it('returns null when no versions', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      expect(await repo.getLatestVersionId(LENS_ID)).toBeNull()
    })

    it('returns null when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getLatestVersionId(LENS_ID)).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // getLatestPublishedVersion
  // ---------------------------------------------------------------------------
  describe('getLatestPublishedVersion', () => {
    it('returns null for non-UUID lensId', async () => {
      expect(await repo.getLatestPublishedVersion('bad-id')).toBeNull()
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('calls fn_get_lens_detail_bootstrap', async () => {
      mockRpc.mockResolvedValue({
        data: { error: null, latest_published_version: null },
        error: null,
      })
      await repo.getLatestPublishedVersion(LENS_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_lens_detail_bootstrap', { p_lens_id: LENS_ID })
    })

    it('returns null when latest_published_version is null', async () => {
      mockRpc.mockResolvedValue({ data: { latest_published_version: null }, error: null })
      expect(await repo.getLatestPublishedVersion(LENS_ID)).toBeNull()
    })

    it('returns null when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getLatestPublishedVersion(LENS_ID)).toBeNull()
    })

    it('maps latest_published_version to LensVersion shape', async () => {
      mockRpc.mockResolvedValue({
        data: {
          latest_published_version: { ...rawVersion, parameters: [] },
        },
        error: null,
      })
      const result = await repo.getLatestPublishedVersion(LENS_ID)
      expect(result?.id).toBe(VERSION_ID)
      expect(result?.templateBody).toBe('Hello {{name}}')
    })
  })

  // ---------------------------------------------------------------------------
  // createVersion
  // ---------------------------------------------------------------------------
  describe('createVersion', () => {
    it('calls fn_create_draft_version with all fields', async () => {
      mockRpc.mockResolvedValue({ data: rawVersion, error: null })
      await repo.createVersion({
        lensId: LENS_ID,
        templateBody: 'body',
        changelog: 'Initial',
        parentVersionId: null,
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_create_draft_version', {
        p_lens_id: LENS_ID,
        p_template_body: 'body',
        p_changelog: 'Initial',
        p_parent_version_id: null,
      })
    })

    it('maps returned version row', async () => {
      mockRpc.mockResolvedValue({ data: rawVersion, error: null })
      const result = await repo.createVersion({ lensId: LENS_ID, templateBody: 'body' })
      expect(result.id).toBe(VERSION_ID)
      expect(result.versionNumber).toBe(1)
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('create version error') })
      await expect(repo.createVersion({ lensId: LENS_ID, templateBody: 'body' })).rejects.toThrow(
        'create version error'
      )
    })
  })

  // ---------------------------------------------------------------------------
  // publishVersion
  // ---------------------------------------------------------------------------
  describe('publishVersion', () => {
    it('calls fn_lenses_publish_version with p_version_id', async () => {
      await repo.publishVersion(VERSION_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_lenses_publish_version', { p_version_id: VERSION_ID })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('publish error') })
      await expect(repo.publishVersion(VERSION_ID)).rejects.toThrow('publish error')
    })
  })

  // ---------------------------------------------------------------------------
  // updateVersionParams
  // ---------------------------------------------------------------------------
  describe('updateVersionParams', () => {
    it('calls fn_update_lens_version_params with mapped params', async () => {
      await repo.updateVersionParams(VERSION_ID, [{ label: 'Input', toolId: 'tool-1' }])
      expect(mockRpc).toHaveBeenCalledWith('fn_update_lens_version_params', {
        p_version_id: VERSION_ID,
        p_params: [{ label: 'Input', tool_id: 'tool-1', optional: false }],
      })
    })
  })

  // ---------------------------------------------------------------------------
  // cloneLens
  // ---------------------------------------------------------------------------
  describe('cloneLens', () => {
    it('calls fn_clone_lens with p_source_lens_id', async () => {
      mockRpc.mockResolvedValue({ data: 'new-lens-id', error: null })
      const result = await repo.cloneLens(LENS_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_clone_lens', {
        p_source_lens_id: LENS_ID,
        p_version_id: null,
      })
      expect(result).toBe('new-lens-id')
    })

    it('passes versionId when provided', async () => {
      mockRpc.mockResolvedValue({ data: 'new-lens-id', error: null })
      await repo.cloneLens(LENS_ID, VERSION_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_clone_lens', {
        p_source_lens_id: LENS_ID,
        p_version_id: VERSION_ID,
      })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('clone error') })
      await expect(repo.cloneLens(LENS_ID)).rejects.toThrow('clone error')
    })
  })

  // ---------------------------------------------------------------------------
  // getTools
  // ---------------------------------------------------------------------------
  describe('getTools', () => {
    it('calls fn_list_tools with null category by default', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getTools()
      expect(mockRpc).toHaveBeenCalledWith('fn_list_tools', { p_category: null })
    })

    it('passes category when provided', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getTools('input')
      expect(mockRpc).toHaveBeenCalledWith('fn_list_tools', { p_category: 'input' })
    })

    it('maps raw tool to ToolRecord shape', async () => {
      const rawTool = {
        id: 'tool-1',
        key: 'text_input',
        label: 'Text',
        description: 'Enter text',
        category: 'input',
        type: 'text',
        required: true,
        min_length: 0,
        max_length: 500,
        placeholder: null,
        help_text: null,
        validation_schema: null,
        options: null,
        sort_order: 0,
        is_system: false,
        icon: null,
        color: null,
      }
      mockRpc.mockResolvedValue({ data: [rawTool], error: null })
      const [tool] = await repo.getTools()
      expect(tool.id).toBe('tool-1')
      expect(tool.minLength).toBe(0)
      expect(tool.maxLength).toBe(500)
      expect(tool.isSystem).toBe(false)
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getTools()).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // getForkTree
  // ---------------------------------------------------------------------------
  describe('getForkTree', () => {
    it('calls fn_get_lens_fork_tree with p_lens_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getForkTree(LENS_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_lens_fork_tree', { p_lens_id: LENS_ID })
    })

    it('maps raw fork rows to ForkNode shape', async () => {
      const raw = {
        lens_id: LENS_ID,
        forked_from_lens_id: 'parent-id',
        forked_from_title: 'Parent',
        depth: 1,
        forked_from_lenser_id: LENSER_ID,
        forked_from_lenser_name: 'Alice',
        forked_from_lenser_handle: 'alice',
        forked_from_lenser_avatar_url: null,
        forked_from_version_id: null,
        forked_from_version_number: null,
      }
      mockRpc.mockResolvedValue({ data: [raw], error: null })
      const [node] = await repo.getForkTree(LENS_ID)
      expect(node.lensId).toBe(LENS_ID)
      expect(node.forkedFromTitle).toBe('Parent')
      expect(node.depth).toBe(1)
      expect(node.forkedFromLenserHandle).toBe('alice')
    })

    it('respects limit parameter', async () => {
      const rows = Array.from({ length: 5 }, (_, i) => ({
        lens_id: `l-${i}`,
        forked_from_lens_id: LENS_ID,
        forked_from_title: `T${i}`,
        depth: i,
        forked_from_lenser_id: LENSER_ID,
        forked_from_lenser_name: 'A',
        forked_from_lenser_handle: 'a',
        forked_from_lenser_avatar_url: null,
        forked_from_version_id: null,
        forked_from_version_number: null,
      }))
      mockRpc.mockResolvedValue({ data: rows, error: null })
      const result = await repo.getForkTree(LENS_ID, 3)
      expect(result).toHaveLength(3)
    })

    it('returns empty array when data is empty', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      expect(await repo.getForkTree(LENS_ID)).toEqual([])
    })
  })
})
