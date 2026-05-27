/**
 * @deprecated Use mediaRepository.ts and mediaService.ts instead.
 * This file is retained for backward compatibility during the migration
 * from ai.resources to media.objects.
 */

import { supabase } from '@lenserfight/data/supabase'
import {
  PromptResource,
  VersionResource,
  CreateResourceDTO,
  ResourceUploadSession,
} from '@lenserfight/types'

// --- Port (Interface) ---
/** @deprecated Use MediaRepositoryPort from mediaRepository.ts */

export interface ResourcesRepositoryPort {
  getByOwner(lenserId: string, limit?: number): Promise<PromptResource[]>
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
/** @deprecated Use SupabaseMediaRepository from mediaRepository.ts */
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

  async getByOwner(_lenserId: string, limit = 200): Promise<PromptResource[]> {
    const { data, error } = await supabase.rpc('fn_list_resources', {
      p_limit: limit,
      p_cursor: null,
      p_resource_type: null,
    })

    if (error) this.handleError(error)
    return ((data ?? []) as Record<string, unknown>[]).map((row) => this.mapRow(row))
  }

  async getById(id: string): Promise<PromptResource | null> {
    const { data, error } = await supabase.rpc('fn_get_media_object', {
      p_object_id: id,
    })

    if (error) this.handleError(error)
    if (!data?.[0]) return null
    return this.mapRow(data[0] as Record<string, unknown>)
  }

  async create(input: CreateResourceDTO): Promise<PromptResource> {
    const { data, error } = await supabase.rpc('fn_create_media_object', {
      p_workspace_id: null,
      p_media_type: input.mediaType,
      p_mime_type: input.mimeType ?? null,
      p_name: input.name,
      p_content_text: input.contentText ?? null,
      p_external_url: input.url ?? null,
    })

    if (error) this.handleError(error)
    if (!data?.[0]) throw new Error('Failed to create resource')
    return this.mapRow(data[0] as Record<string, unknown>)
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

  async finalizeUpload(resourceId: string, bucket: string, objectKey: string): Promise<void> {
    const { error } = await supabase.rpc('fn_media_finalize_upload', {
      p_object_id: resourceId,
      p_bucket: bucket,
      p_object_key: objectKey,
      p_byte_size: null,
      p_checksum: null,
    })

    if (error) this.handleError(error)
  }

  async delete(id: string): Promise<void> {
    const resource = await this.getById(id)

    const { error } = await supabase.rpc('fn_media_soft_delete', {
      p_object_id: id,
    })

    if (error) this.handleError(error)

    if (resource?.storageBucket && resource.objectKey) {
      await supabase.storage
        .from(resource.storageBucket)
        .remove([resource.objectKey])
        .catch(() => undefined)
    }
  }

  async attachToVersion(versionId: string, resourceId: string, bindingKey: string): Promise<void> {
    const { error } = await supabase.rpc('fn_media_bind_attachment', {
      p_object_id: resourceId,
      p_entity_type: 'lens_version',
      p_entity_id: versionId,
      p_binding_key: bindingKey,
    })

    if (error) this.handleError(error)
  }

  async detachFromVersion(versionId: string, resourceId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_media_unbind_attachment', {
      p_entity_type: 'lens_version',
      p_entity_id: versionId,
      p_binding_key: resourceId,
    })

    if (error) this.handleError(error)
  }

  async getForVersion(versionId: string): Promise<VersionResource[]> {
    const { data, error } = await supabase.rpc('fn_get_entity_media_attachments', {
      p_entity_type: 'lens_version',
      p_entity_id: versionId,
    })

    if (error) this.handleError(error)

    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      versionId,
      resourceId: row.object_id as string,
      bindingKey: row.binding_key as string,
      resource: this.mapRow(row),
    }))
  }
}

