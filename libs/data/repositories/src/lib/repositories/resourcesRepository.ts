import { supabase } from '@lenserfight/data/supabase'
import {
  PromptResource,
  VersionResource,
  CreateResourceDTO,
  ResourceUploadSession,
} from '@lenserfight/types'

// --- Port (Interface) ---

export interface ResourcesRepositoryPort {
  getByOwner(lenserId: string): Promise<PromptResource[]>
  getById(id: string): Promise<PromptResource | null>
  create(input: CreateResourceDTO): Promise<PromptResource>
  getSignedUploadUrl(bucket: string, objectKey: string): Promise<string>
  finalizeUpload(resourceId: string, bucket: string, objectKey: string): Promise<void>
  delete(id: string): Promise<void>
  attachToVersion(versionId: string, resourceId: string, bindingKey: string): Promise<void>
  detachFromVersion(versionId: string, resourceId: string): Promise<void>
  getForVersion(versionId: string): Promise<VersionResource[]>
}

// --- Supabase Implementation ---

export class SupabaseResourcesRepository implements ResourcesRepositoryPort {
  private handleError(error: unknown): never {
    const e = error as { code?: string; message?: string }
    if (e.code === '42501' || e.message?.includes('permission denied')) {
      throw new Error('Resource is private or access is denied.')
    }
    if (e.code === 'PGRST116') {
      throw new Error('Resource not found.')
    }
    throw error
  }

  private mapRow(row: Record<string, unknown>): PromptResource {
    return {
      id: row.id as string,
      ownerLenserId: row.owner_lenser_id as string,
      mediaType: row.media_type as PromptResource['mediaType'],
      mimeType: (row.mime_type as string | null) ?? null,
      name: row.name as string,
      storageBucket: (row.storage_bucket as string | null) ?? null,
      objectKey: (row.object_key as string | null) ?? null,
      contentText: (row.content_text as string | null) ?? null,
      url: (row.url as string | null) ?? null,
      byteSize: (row.byte_size as number | null) ?? null,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      isPublic: row.is_public as boolean,
      createdAt: row.created_at as string,
    }
  }

  async getByOwner(lenserId: string): Promise<PromptResource[]> {
    const { data, error } = await supabase
      .schema('content')
      .from('resources')
      .select('*')
      .eq('owner_lenser_id', lenserId)
      .order('created_at', { ascending: false })

    if (error) this.handleError(error)
    return ((data ?? []) as Record<string, unknown>[]).map((row) => this.mapRow(row))
  }

  async getById(id: string): Promise<PromptResource | null> {
    const { data, error } = await supabase
      .schema('content')
      .from('resources')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) this.handleError(error)
    if (!data) return null
    return this.mapRow(data as Record<string, unknown>)
  }

  async create(input: CreateResourceDTO): Promise<PromptResource> {
    const { data, error } = await supabase
      .schema('content')
      .from('resources')
      .insert({
        media_type: input.mediaType,
        mime_type: input.mimeType ?? null,
        name: input.name,
        content_text: input.contentText ?? null,
        url: input.url ?? null,
      })
      .select('*')
      .single()

    if (error) this.handleError(error)
    return this.mapRow(data as Record<string, unknown>)
  }

  /**
   * Returns a signed upload URL for direct browser → Supabase Storage upload.
   * The resource row must already exist (call create() first).
   */
  async getSignedUploadUrl(bucket: string, objectKey: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(objectKey)

    if (error) throw error
    return data.signedUrl
  }

  /**
   * Called after the browser upload completes. Updates the resource row
   * with the confirmed storage location.
   */
  async finalizeUpload(resourceId: string, bucket: string, objectKey: string): Promise<void> {
    const { error } = await supabase
      .schema('content')
      .from('resources')
      .update({ storage_bucket: bucket, object_key: objectKey })
      .eq('id', resourceId)

    if (error) this.handleError(error)
  }

  async delete(id: string): Promise<void> {
    // Fetch storage location before delete (CASCADE will remove the row)
    const resource = await this.getById(id)

    const { error } = await supabase
      .schema('content')
      .from('resources')
      .delete()
      .eq('id', id)

    if (error) this.handleError(error)

    // Best-effort storage cleanup after DB row removed
    if (resource?.storageBucket && resource.objectKey) {
      await supabase.storage
        .from(resource.storageBucket)
        .remove([resource.objectKey])
        .catch(() => undefined) // Non-fatal — orphaned object is acceptable
    }
  }

  async attachToVersion(versionId: string, resourceId: string, bindingKey: string): Promise<void> {
    const { error } = await supabase
      .schema('content')
      .from('version_resources')
      .upsert({ version_id: versionId, resource_id: resourceId, binding_key: bindingKey })

    if (error) this.handleError(error)
  }

  async detachFromVersion(versionId: string, resourceId: string): Promise<void> {
    const { error } = await supabase
      .schema('content')
      .from('version_resources')
      .delete()
      .eq('version_id', versionId)
      .eq('resource_id', resourceId)

    if (error) this.handleError(error)
  }

  async getForVersion(versionId: string): Promise<VersionResource[]> {
    const { data, error } = await supabase
      .schema('content')
      .from('version_resources')
      .select('version_id, resource_id, binding_key, resource:resources(*)')
      .eq('version_id', versionId)

    if (error) this.handleError(error)

    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      versionId: row.version_id as string,
      resourceId: row.resource_id as string,
      bindingKey: row.binding_key as string,
      resource: row.resource ? this.mapRow(row.resource as Record<string, unknown>) : undefined,
    }))
  }
}

export const resourcesRepository = new SupabaseResourcesRepository()

/**
 * Helper: full upload session — creates resource, gets signed URL.
 * Returns all info needed for the browser to upload directly to Supabase Storage.
 */
export async function startResourceUpload(
  input: CreateResourceDTO,
  bucket: string,
  objectKey: string
): Promise<ResourceUploadSession> {
  const resource = await resourcesRepository.create(input)
  const signedUploadUrl = await resourcesRepository.getSignedUploadUrl(bucket, objectKey)
  return { resourceId: resource.id, signedUploadUrl, bucket, objectKey }
}
