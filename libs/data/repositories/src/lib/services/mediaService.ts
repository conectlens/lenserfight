import { SupabaseMediaRepository, startMediaUpload } from '../repositories/mediaRepository'
import { MediaObject, MediaAttachment, CreateMediaObjectDTO, UploadSession } from '@lenserfight/types'

const mediaRepo = new SupabaseMediaRepository()

export const mediaService = {
  getByOwner: async (lenserId: string): Promise<MediaObject[]> => {
    return mediaRepo.getByOwner(lenserId)
  },

  getById: async (id: string): Promise<MediaObject | null> => {
    return mediaRepo.getById(id)
  },

  /**
   * Creates a media object for inline content (text, JSON, or external URL).
   * No storage upload required.
   */
  createInline: async (input: CreateMediaObjectDTO, workspaceId: string): Promise<MediaObject> => {
    return mediaRepo.create(input, workspaceId)
  },

  /**
   * Initiates a file upload session for storage-backed media objects.
   * Returns a signed URL for the browser to upload directly to Supabase Storage.
   * Call finalizeUpload() after the upload completes.
   */
  startUpload: async (
    input: CreateMediaObjectDTO,
    workspaceId: string,
    bucket: string,
    objectKey: string,
  ): Promise<UploadSession> => {
    return startMediaUpload(input, workspaceId, bucket, objectKey)
  },

  finalizeUpload: async (
    objectId: string,
    bucket: string,
    objectKey: string,
    byteSize?: number,
    checksum?: string,
  ): Promise<void> => {
    return mediaRepo.finalize(objectId, bucket, objectKey, byteSize, checksum)
  },

  softDelete: async (id: string): Promise<void> => {
    return mediaRepo.softDelete(id)
  },

  getAttachmentsForEntity: async (entityType: string, entityId: string): Promise<MediaAttachment[]> => {
    return mediaRepo.getAttachmentsForEntity(entityType, entityId)
  },

  bindAttachment: async (
    objectId: string,
    entityType: string,
    entityId: string,
    bindingKey: string,
  ): Promise<void> => {
    return mediaRepo.bindAttachment(objectId, entityType, entityId, bindingKey)
  },

  unbindAttachment: async (
    entityType: string,
    entityId: string,
    bindingKey: string,
  ): Promise<void> => {
    return mediaRepo.unbindAttachment(entityType, entityId, bindingKey)
  },
}
