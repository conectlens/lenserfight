import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc, mockStorage } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockStorage: {
    from: vi.fn(),
  },
}))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc, storage: mockStorage },
}))

vi.mock('../factory', () => ({
  createResourcesRepository: vi.fn(() => null),
}))

import { SupabaseResourcesRepository } from './resourcesRepository'

const OWNER_LENSER_ID = 'lenser-uuid-1'
const RESOURCE_ID = 'resource-uuid-1'
const VERSION_ID = 'version-uuid-1'

const rawRow = {
  id: RESOURCE_ID,
  owner_lenser_id: OWNER_LENSER_ID,
  media_type: 'image',
  mime_type: 'image/png',
  name: 'photo.png',
  storage_bucket: 'media',
  object_key: 'uploads/photo.png',
  content_text: null,
  url: null,
  byte_size: 2048,
  metadata: null,
  is_public: false,
  created_at: '2026-01-01T00:00:00Z',
}

describe('SupabaseResourcesRepository', () => {
  let repo: SupabaseResourcesRepository

  beforeEach(() => {
    repo = new SupabaseResourcesRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---------------------------------------------------------------------------
  // handleError (via getByOwner)
  // ---------------------------------------------------------------------------
  describe('handleError (via getByOwner)', () => {
    it('throws permission denied message on 42501', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied' } })
      await expect(repo.getByOwner(OWNER_LENSER_ID)).rejects.toThrow('Resource is private or access is denied.')
    })

    it('throws "Resource not found." on PGRST116', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      await expect(repo.getByOwner(OWNER_LENSER_ID)).rejects.toThrow('Resource not found.')
    })
  })

  // ---------------------------------------------------------------------------
  // getByOwner
  // ---------------------------------------------------------------------------
  describe('getByOwner', () => {
    it('calls fn_list_resources with default limit 200', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getByOwner(OWNER_LENSER_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_resources', { p_limit: 200, p_cursor: null, p_resource_type: null })
    })

    it('maps rows to PromptResource shape', async () => {
      mockRpc.mockResolvedValue({ data: [rawRow], error: null })
      const result = await repo.getByOwner(OWNER_LENSER_ID)
      expect(result[0].id).toBe(RESOURCE_ID)
      expect(result[0].mediaType).toBe('image')
      expect(result[0].storageBucket).toBe('media')
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getByOwner(OWNER_LENSER_ID)).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // getById
  // ---------------------------------------------------------------------------
  describe('getById', () => {
    it('calls fn_get_media_object with p_object_id', async () => {
      mockRpc.mockResolvedValue({ data: [rawRow], error: null })
      const result = await repo.getById(RESOURCE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_media_object', { p_object_id: RESOURCE_ID })
      expect(result?.id).toBe(RESOURCE_ID)
    })

    it('returns null when data is empty', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      expect(await repo.getById(RESOURCE_ID)).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('calls fn_create_media_object with dto fields', async () => {
      mockRpc.mockResolvedValue({ data: [rawRow], error: null })
      await repo.create({ mediaType: 'image', mimeType: 'image/png', name: 'photo.png', contentText: null, url: null })
      expect(mockRpc).toHaveBeenCalledWith('fn_create_media_object', expect.objectContaining({
        p_workspace_id: null,
        p_media_type: 'image',
        p_name: 'photo.png',
      }))
    })

    it('throws "Failed to create resource" when data is empty', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await expect(repo.create({ mediaType: 'image', name: 'p.png' })).rejects.toThrow('Failed to create resource')
    })
  })

  // ---------------------------------------------------------------------------
  // finalizeUpload
  // ---------------------------------------------------------------------------
  describe('finalizeUpload', () => {
    it('calls fn_media_finalize_upload with all params', async () => {
      await repo.finalizeUpload(RESOURCE_ID, 'media', 'uploads/photo.png')
      expect(mockRpc).toHaveBeenCalledWith('fn_media_finalize_upload', expect.objectContaining({
        p_object_id: RESOURCE_ID,
        p_bucket: 'media',
        p_object_key: 'uploads/photo.png',
      }))
    })
  })

  // ---------------------------------------------------------------------------
  // attachToVersion / detachFromVersion
  // ---------------------------------------------------------------------------
  describe('attachToVersion', () => {
    it('calls fn_media_bind_attachment with entity_type=lens_version', async () => {
      await repo.attachToVersion(VERSION_ID, RESOURCE_ID, 'main_image')
      expect(mockRpc).toHaveBeenCalledWith('fn_media_bind_attachment', {
        p_object_id: RESOURCE_ID,
        p_entity_type: 'lens_version',
        p_entity_id: VERSION_ID,
        p_binding_key: 'main_image',
      })
    })
  })

  describe('detachFromVersion', () => {
    it('calls fn_media_unbind_attachment with entity_type=lens_version', async () => {
      await repo.detachFromVersion(VERSION_ID, RESOURCE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_media_unbind_attachment', {
        p_entity_type: 'lens_version',
        p_entity_id: VERSION_ID,
        p_binding_key: RESOURCE_ID,
      })
    })
  })

  // ---------------------------------------------------------------------------
  // getForVersion
  // ---------------------------------------------------------------------------
  describe('getForVersion', () => {
    it('calls fn_get_entity_media_attachments and maps to VersionResource shape', async () => {
      const row = { ...rawRow, object_id: RESOURCE_ID, binding_key: 'main_image' }
      mockRpc.mockResolvedValue({ data: [row], error: null })
      const result = await repo.getForVersion(VERSION_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_entity_media_attachments', {
        p_entity_type: 'lens_version',
        p_entity_id: VERSION_ID,
      })
      expect(result[0].versionId).toBe(VERSION_ID)
      expect(result[0].bindingKey).toBe('main_image')
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getForVersion(VERSION_ID)).toEqual([])
    })
  })
})
