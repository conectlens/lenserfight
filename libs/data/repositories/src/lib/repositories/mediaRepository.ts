import { supabase } from '@lenserfight/data/supabase'
import {
  MediaObject,
  MediaAttachment,
  CreateMediaObjectDTO,
  UploadSession,
} from '@lenserfight/types'
import type { StorageAdapterPort } from '@lenserfight/infra/storage'
import { getStorageAdapter } from '@lenserfight/infra/storage'

// --- Port (Interface) ---

export interface MediaRepositoryPort {
  getByOwner(lenserId: string, limit?: number): Promise<MediaObject[]>
  getById(id: string): Promise<MediaObject | null>
  create(input: CreateMediaObjectDTO, workspaceId: string): Promise<MediaObject>
  finalize(objectId: string, bucket: string, objectKey: string, byteSize?: number, checksum?: string): Promise<void>
  softDelete(id: string): Promise<void>
  bindAttachment(objectId: string, entityType: string, entityId: string, bindingKey: string): Promise<void>
  unbindAttachment(entityType: string, entityId: string, bindingKey: string): Promise<void>
  getAttachmentsForEntity(entityType: string, entityId: string): Promise<MediaAttachment[]>
  getSignedUploadUrl(bucket: string, objectKey: string): Promise<{ signedUrl: string; token: string }>
  deleteStorageObject(bucket: string, objectKey: string): Promise<void>
}

// --- Supabase Implementation ---

export class SupabaseMediaRepository implements MediaRepositoryPort {
  private storageAdapter: StorageAdapterPort

  constructor(storageAdapter?: StorageAdapterPort) {
    this.storageAdapter = storageAdapter ?? getStorageAdapter()
  }

  private handleError(error: unknown): never {
    const e = error as { code?: string; message?: string }
    if (e.code === '42501' || e.message?.includes('permission denied')) {
      throw new Error('Media object is private or access is denied.')
    }
    if (e.code === 'PGRST116') {
      throw new Error('Media object not found.')
    }
    throw error
  }

  private mapObject(row: Record<string, unknown>): MediaObject {
    return {
      id: row.id as string,
      workspaceId: row.workspace_id as string,
      ownerLenserId: row.owner_lenser_id as string,
      bucket: (row.bucket as string | null) ?? null,
      objectKey: (row.object_key as string | null) ?? null,
      contentText: (row.content_text as string | null) ?? null,
      externalUrl: (row.external_url as string | null) ?? null,
      mimeType: (row.mime_type as string | null) ?? null,
      mediaType: row.media_type as MediaObject['mediaType'],
      name: row.name as string,
      byteSize: (row.byte_size as number | null) ?? null,
      checksumSha256: (row.checksum_sha256 as string | null) ?? null,
      visibility: (row.visibility as MediaObject['visibility']) ?? 'private',
      lifecycleState: (row.lifecycle_state as MediaObject['lifecycleState']) ?? 'pending',
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }

  private mapAttachment(row: Record<string, unknown>): MediaAttachment {
    return {
      id: row.id as string,
      objectId: row.object_id as string,
      entityType: row.entity_type as string,
      entityId: row.entity_id as string,
      bindingKey: row.binding_key as string,
      attachedBy: (row.attached_by as string | null) ?? null,
      attachedAt: row.attached_at as string,
      object: row.object ? this.mapObject(row.object as Record<string, unknown>) : undefined,
    }
  }

  async getByOwner(lenserId: string, limit = 200): Promise<MediaObject[]> {
    const { data, error } = await supabase
      .schema('media')
      .from('objects')
      .select('*')
      .eq('owner_lenser_id', lenserId)
      .neq('lifecycle_state', 'deleted')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) this.handleError(error)
    return ((data ?? []) as Record<string, unknown>[]).map((row) => this.mapObject(row))
  }

  async getById(id: string): Promise<MediaObject | null> {
    const { data, error } = await supabase
      .schema('media')
      .from('objects')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) this.handleError(error)
    if (!data) return null
    return this.mapObject(data as Record<string, unknown>)
  }

  async create(input: CreateMediaObjectDTO, workspaceId: string): Promise<MediaObject> {
    const { data, error } = await supabase
      .schema('media')
      .from('objects')
      .insert({
        workspace_id: workspaceId,
        media_type: input.mediaType,
        mime_type: input.mimeType ?? null,
        name: input.name,
        content_text: input.contentText ?? null,
        external_url: input.externalUrl ?? null,
        lifecycle_state: input.contentText || input.externalUrl ? 'active' : 'pending',
      })
      .select('*')
      .single()

    if (error) this.handleError(error)
    return this.mapObject(data as Record<string, unknown>)
  }

  async finalize(
    objectId: string,
    bucket: string,
    objectKey: string,
    byteSize?: number,
    checksum?: string,
  ): Promise<void> {
    const { error } = await supabase.rpc('fn_media_finalize_upload', {
      p_object_id: objectId,
      p_bucket: bucket,
      p_object_key: objectKey,
      p_byte_size: byteSize ?? null,
      p_checksum: checksum ?? null,
    })

    if (error) this.handleError(error)
  }

  async softDelete(id: string): Promise<void> {
    // Fetch storage location before soft-delete
    const obj = await this.getById(id)

    const { error } = await supabase.rpc('fn_media_soft_delete', {
      p_object_id: id,
    })

    if (error) this.handleError(error)

    // Best-effort storage cleanup
    if (obj?.bucket && obj.objectKey) {
      await this.storageAdapter
        .deleteObject(obj.bucket, obj.objectKey)
        .catch(() => undefined)
    }
  }

  async bindAttachment(
    objectId: string,
    entityType: string,
    entityId: string,
    bindingKey: string,
  ): Promise<void> {
    const { error } = await supabase.rpc('fn_media_bind_attachment', {
      p_object_id: objectId,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_binding_key: bindingKey,
    })

    if (error) this.handleError(error)
  }

  async unbindAttachment(
    entityType: string,
    entityId: string,
    bindingKey: string,
  ): Promise<void> {
    const { error } = await supabase.rpc('fn_media_unbind_attachment', {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_binding_key: bindingKey,
    })

    if (error) this.handleError(error)
  }

  async getAttachmentsForEntity(entityType: string, entityId: string): Promise<MediaAttachment[]> {
    const { data, error } = await supabase
      .schema('media')
      .from('attachments')
      .select('*, object:objects(*)')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)

    if (error) this.handleError(error)
    return ((data ?? []) as Record<string, unknown>[]).map((row) => this.mapAttachment(row))
  }

  async getSignedUploadUrl(bucket: string, objectKey: string): Promise<{ signedUrl: string; token: string }> {
    return this.storageAdapter.createSignedUploadUrl(bucket, objectKey)
  }

  async deleteStorageObject(bucket: string, objectKey: string): Promise<void> {
    return this.storageAdapter.deleteObject(bucket, objectKey)
  }
}

export const mediaRepository = new SupabaseMediaRepository()

/**
 * Helper: full upload session — creates media object, gets signed URL.
 * Returns all info needed for the browser to upload directly to storage.
 */
export async function startMediaUpload(
  input: CreateMediaObjectDTO,
  workspaceId: string,
  bucket: string,
  objectKey: string,
): Promise<UploadSession> {
  const obj = await mediaRepository.create(input, workspaceId)
  const { signedUrl } = await mediaRepository.getSignedUploadUrl(bucket, objectKey)
  return { objectId: obj.id, signedUploadUrl: signedUrl, bucket, objectKey }
}
