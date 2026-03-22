import { SupabaseResourcesRepository, startResourceUpload } from '../repositories/resourcesRepository'
import { PromptResource, VersionResource, CreateResourceDTO, ResourceUploadSession } from '@lenserfight/types'

const resourcesRepo = new SupabaseResourcesRepository()

export const resourcesService = {
  getByOwner: async (lenserId: string): Promise<PromptResource[]> => {
    return resourcesRepo.getByOwner(lenserId)
  },

  getById: async (id: string): Promise<PromptResource | null> => {
    return resourcesRepo.getById(id)
  },

  /**
   * Creates a resource record for inline content (text, JSON, or external URL).
   * No storage upload required.
   */
  createInline: async (input: CreateResourceDTO): Promise<PromptResource> => {
    return resourcesRepo.create(input)
  },

  /**
   * Initiates a file upload session for storage-backed resources.
   * Returns a signed URL for the browser to upload directly to Supabase Storage.
   * Call finalizeUpload() after the upload completes.
   */
  startUpload: async (
    input: CreateResourceDTO,
    bucket: string,
    objectKey: string
  ): Promise<ResourceUploadSession> => {
    return startResourceUpload(input, bucket, objectKey)
  },

  finalizeUpload: async (resourceId: string, bucket: string, objectKey: string): Promise<void> => {
    return resourcesRepo.finalizeUpload(resourceId, bucket, objectKey)
  },

  delete: async (id: string): Promise<void> => {
    return resourcesRepo.delete(id)
  },

  getForVersion: async (versionId: string): Promise<VersionResource[]> => {
    return resourcesRepo.getForVersion(versionId)
  },

  attachToVersion: async (versionId: string, resourceId: string, bindingKey: string): Promise<void> => {
    return resourcesRepo.attachToVersion(versionId, resourceId, bindingKey)
  },

  detachFromVersion: async (versionId: string, resourceId: string): Promise<void> => {
    return resourcesRepo.detachFromVersion(versionId, resourceId)
  },
}
