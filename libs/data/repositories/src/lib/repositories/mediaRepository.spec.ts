import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

vi.mock('@lenserfight/infra/storage', () => ({
  getStorageAdapter: vi.fn(() => mockStorageAdapter),
}))

vi.mock('../factory', () => ({
  createMediaRepository: vi.fn(() => null),
}))

// Mock storage adapter — shared instance, defined here for easy per-test setup
const mockStorageAdapter = {
  createSignedUploadUrl: vi.fn(),
  deleteObject: vi.fn(),
}

import { SupabaseMediaRepository } from './mediaRepository'

const OBJECT_ID = 'object-uuid-1'
const WORKSPACE_ID = 'workspace-uuid-1'
const LENSER_ID = 'lenser-uuid-1'
const ENTITY_ID = 'entity-uuid-1'

const rawRow = {
  id: OBJECT_ID,
  workspace_id: WORKSPACE_ID,
  owner_lenser_id: LENSER_ID,
  bucket: 'media',
  object_key: 'uploads/file.png',
  content_text: null,
  external_url: null,
  mime_type: 'image/png',
  media_type: 'image',
  name: 'file.png',
  byte_size: 1024,
  checksum_sha256: null,
  visibility: 'private',
  lifecycle_state: 'uploaded',
  metadata: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('SupabaseMediaRepository', () => {
  let repo: SupabaseMediaRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new SupabaseMediaRepository(mockStorageAdapter)
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockStorageAdapter.createSignedUploadUrl.mockResolvedValue({ signedUrl: 'https://storage.example.com/signed', token: 'tok' })
    mockStorageAdapter.deleteObject.mockResolvedValue(undefined)
  })

  // ---------------------------------------------------------------------------
  // handleError (via getByOwner)
  // ---------------------------------------------------------------------------
  describe('handleError (via getByOwner)', () => {
    it('throws permission denied message on 42501', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied' } })
      await expect(repo.getByOwner(LENSER_ID)).rejects.toThrow('Media object is private or access is denied.')
    })

    it('throws "Media object not found." on PGRST116', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      await expect(repo.getByOwner(LENSER_ID)).rejects.toThrow('Media object not found.')
    })

    it('rethrows generic errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('db error') })
      await expect(repo.getByOwner(LENSER_ID)).rejects.toThrow('db error')
    })
  })

  // ---------------------------------------------------------------------------
  // getByOwner
  // ---------------------------------------------------------------------------
  describe('getByOwner', () => {
    it('calls fn_list_media_objects with default limit 200', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getByOwner(LENSER_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_media_objects', { p_limit: 200, p_cursor: null })
    })

    it('maps rows to MediaObject shape', async () => {
      mockRpc.mockResolvedValue({ data: [rawRow], error: null })
      const result = await repo.getByOwner(LENSER_ID)
      expect(result[0].id).toBe(OBJECT_ID)
      expect(result[0].mediaType).toBe('image')
      expect(result[0].objectKey).toBe('uploads/file.png')
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getByOwner(LENSER_ID)).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // getById
  // ---------------------------------------------------------------------------
  describe('getById', () => {
    it('calls fn_get_media_object with p_object_id', async () => {
      mockRpc.mockResolvedValue({ data: [rawRow], error: null })
      const result = await repo.getById(OBJECT_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_media_object', { p_object_id: OBJECT_ID })
      expect(result?.id).toBe(OBJECT_ID)
    })

    it('returns null when data is empty', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      expect(await repo.getById(OBJECT_ID)).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('calls fn_create_media_object with dto and workspaceId', async () => {
      mockRpc.mockResolvedValue({ data: [rawRow], error: null })
      await repo.create({
        mediaType: 'image',
        mimeType: 'image/png',
        name: 'file.png',
        contentText: null,
        externalUrl: null,
      }, WORKSPACE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_create_media_object', {
        p_workspace_id: WORKSPACE_ID,
        p_media_type: 'image',
        p_mime_type: 'image/png',
        p_name: 'file.png',
        p_content_text: null,
        p_external_url: null,
      })
    })

    it('throws "Failed to create media object" when data is empty', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await expect(repo.create({ mediaType: 'image', name: 'f.png' }, WORKSPACE_ID)).rejects.toThrow('Failed to create media object')
    })
  })

  // ---------------------------------------------------------------------------
  // finalize
  // ---------------------------------------------------------------------------
  describe('finalize', () => {
    it('calls fn_media_finalize_upload with all params', async () => {
      await repo.finalize(OBJECT_ID, 'media', 'uploads/file.png', 1024, 'sha256hash')
      expect(mockRpc).toHaveBeenCalledWith('fn_media_finalize_upload', {
        p_object_id: OBJECT_ID,
        p_bucket: 'media',
        p_object_key: 'uploads/file.png',
        p_byte_size: 1024,
        p_checksum: 'sha256hash',
      })
    })

    it('passes null for absent byteSize and checksum', async () => {
      await repo.finalize(OBJECT_ID, 'media', 'uploads/file.png')
      expect(mockRpc).toHaveBeenCalledWith('fn_media_finalize_upload', expect.objectContaining({
        p_byte_size: null,
        p_checksum: null,
      }))
    })
  })

  // ---------------------------------------------------------------------------
  // bindAttachment / unbindAttachment
  // ---------------------------------------------------------------------------
  describe('bindAttachment', () => {
    it('calls fn_media_bind_attachment with all params', async () => {
      await repo.bindAttachment(OBJECT_ID, 'lens_version', ENTITY_ID, 'main_image')
      expect(mockRpc).toHaveBeenCalledWith('fn_media_bind_attachment', {
        p_object_id: OBJECT_ID,
        p_entity_type: 'lens_version',
        p_entity_id: ENTITY_ID,
        p_binding_key: 'main_image',
      })
    })
  })

  describe('unbindAttachment', () => {
    it('calls fn_media_unbind_attachment with entity info', async () => {
      await repo.unbindAttachment('lens_version', ENTITY_ID, 'main_image')
      expect(mockRpc).toHaveBeenCalledWith('fn_media_unbind_attachment', {
        p_entity_type: 'lens_version',
        p_entity_id: ENTITY_ID,
        p_binding_key: 'main_image',
      })
    })
  })

  // ---------------------------------------------------------------------------
  // getAttachmentsForEntity
  // ---------------------------------------------------------------------------
  describe('getAttachmentsForEntity', () => {
    it('calls fn_get_entity_media_attachments and maps to MediaAttachment shape', async () => {
      const row = { attachment_id: 'att-1', object_id: OBJECT_ID, entity_type: 'lens_version', entity_id: ENTITY_ID, binding_key: 'thumb', attached_at: '2026-01-01T00:00:00Z', ...rawRow }
      mockRpc.mockResolvedValue({ data: [row], error: null })
      const result = await repo.getAttachmentsForEntity('lens_version', ENTITY_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_entity_media_attachments', {
        p_entity_type: 'lens_version',
        p_entity_id: ENTITY_ID,
      })
      expect(result[0].id).toBe('att-1')
      expect(result[0].bindingKey).toBe('thumb')
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getAttachmentsForEntity('lens_version', ENTITY_ID)).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // getSignedUploadUrl (delegates to storage adapter)
  // ---------------------------------------------------------------------------
  describe('getSignedUploadUrl', () => {
    it('delegates to storageAdapter.createSignedUploadUrl', async () => {
      const result = await repo.getSignedUploadUrl('media', 'uploads/file.png')
      expect(mockStorageAdapter.createSignedUploadUrl).toHaveBeenCalledWith('media', 'uploads/file.png')
      expect(result.signedUrl).toBe('https://storage.example.com/signed')
    })
  })

  // ---------------------------------------------------------------------------
  // deleteStorageObject (delegates to storage adapter)
  // ---------------------------------------------------------------------------
  describe('deleteStorageObject', () => {
    it('delegates to storageAdapter.deleteObject', async () => {
      await repo.deleteStorageObject('media', 'uploads/file.png')
      expect(mockStorageAdapter.deleteObject).toHaveBeenCalledWith('media', 'uploads/file.png')
    })
  })
})
