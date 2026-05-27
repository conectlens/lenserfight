import { supabase } from '@lenserfight/data/supabase'
import {
  MediaObject,
  MediaAttachment,
  CreateMediaObjectDTO,
  UploadSession,
} from '@lenserfight/types'
import type { StorageAdapterPort } from '@lenserfight/infra/storage'
import { getStorageAdapter } from '@lenserfight/infra/storage'
import {
  deliverMedia,
  deliveryResultToPromptValue,
  type MediaDeliveryPurpose,
} from '../media-delivery'

// --- Port (Interface) ---

export interface MediaRepositoryPort {
  getByOwner(lenserId: string, limit?: number): Promise<MediaObject[]>
  getById(id: string): Promise<MediaObject | null>
  create(input: CreateMediaObjectDTO, workspaceId: string): Promise<MediaObject>
  finalize(objectId: string, bucket: string, objectKey: string, byteSize?: number, checksum?: string): Promise<void>
  softDelete(id: string): Promise<void>
  bindAttachment(objectId: string, entityType: string, entityId: string, bindingKey: string): Promise<void>
  unbindAttachment(entityType: string, entityId: string, bindingKey: string): Promise<void>
  unbindAttachmentObject(
    entityType: string,
    entityId: string,
    bindingKey: string,
    objectId: string,
  ): Promise<void>
  getAttachmentsForEntity(entityType: string, entityId: string): Promise<MediaAttachment[]>
  getSignedUploadUrl(bucket: string, objectKey: string): Promise<{ signedUrl: string; token: string }>
  getSignedReadUrl(objectId: string): Promise<string | null>
  getDeliveredMediaValue(objectId: string, purpose: MediaDeliveryPurpose): Promise<string | null>
  createMediaAccessToken(objectId: string, ttlSeconds?: number): Promise<string | null>
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

  async getByOwner(_lenserId: string, limit = 200): Promise<MediaObject[]> {
    const { data, error } = await supabase.rpc('fn_list_media_objects', {
      p_limit: limit,
      p_cursor: null,
    })

    if (error) this.handleError(error)
    return ((data ?? []) as Record<string, unknown>[]).map((row) => this.mapObject(row))
  }

  async getById(id: string): Promise<MediaObject | null> {
    const { data, error } = await supabase.rpc('fn_get_media_object', {
      p_object_id: id,
    })

    if (error) this.handleError(error)
    if (!data?.[0]) return null
    return this.mapObject(data[0] as Record<string, unknown>)
  }

  async create(input: CreateMediaObjectDTO, workspaceId: string): Promise<MediaObject> {
    const { data, error } = await supabase.rpc('fn_create_media_object', {
      p_workspace_id: workspaceId,
      p_media_type: input.mediaType,
      p_mime_type: input.mimeType ?? null,
      p_name: input.name,
      p_content_text: input.contentText ?? null,
      p_external_url: input.externalUrl ?? null,
    })

    if (error) this.handleError(error)
    if (!data?.[0]) throw new Error('Failed to create media object')
    return this.mapObject(data[0] as Record<string, unknown>)
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

  async unbindAttachmentObject(
    entityType: string,
    entityId: string,
    bindingKey: string,
    objectId: string,
  ): Promise<void> {
    const { error } = await supabase.rpc('fn_media_unbind_attachment_object', {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_binding_key: bindingKey,
      p_object_id: objectId,
    })

    if (error) this.handleError(error)
  }

  async getAttachmentsForEntity(entityType: string, entityId: string): Promise<MediaAttachment[]> {
    const { data, error } = await supabase.rpc('fn_get_entity_media_attachments', {
      p_entity_type: entityType,
      p_entity_id: entityId,
    })

    if (error) this.handleError(error)
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: row.attachment_id as string,
      objectId: row.object_id as string,
      entityType: row.entity_type as string,
      entityId: row.entity_id as string,
      bindingKey: row.binding_key as string,
      attachedBy: null,
      attachedAt: row.attached_at as string,
      object: this.mapObject(row),
    }))
  }

  async getSignedUploadUrl(bucket: string, objectKey: string): Promise<{ signedUrl: string; token: string }> {
    return this.storageAdapter.createSignedUploadUrl(bucket, objectKey)
  }

  /** Raw signed storage URL (may be loopback in local dev). Prefer getDeliveredMediaValue for consumers. */
  async getSignedReadUrl(objectId: string): Promise<string | null> {
    return this.getRawSignedReadUrl(objectId)
  }

  async getDeliveredMediaValue(
    objectId: string,
    purpose: MediaDeliveryPurpose,
  ): Promise<string | null> {
    const obj = await this.getById(objectId)
    if (!obj) return null

    const signedUrl = await this.getRawSignedReadUrl(objectId)
    const mimeType = obj.mimeType ?? 'application/octet-stream'

    const result = await deliverMedia({
      object: obj,
      signedUrl,
      purpose,
      mimeType,
      createAccessToken: (id) => this.createMediaAccessToken(id),
    })

    return deliveryResultToPromptValue(result)
  }

  async createMediaAccessToken(objectId: string, ttlSeconds = 3600): Promise<string | null> {
    const { data, error } = await supabase.rpc('fn_create_media_access_token', {
      p_object_id: objectId,
      p_ttl_seconds: ttlSeconds,
    })

    if (error) return null
    const token = data as string | null
    return typeof token === 'string' && token.length > 0 ? token : null
  }

  private async getRawSignedReadUrl(objectId: string): Promise<string | null> {
    const obj = await this.getById(objectId)
    if (!obj) return null

    if (obj.externalUrl) return obj.externalUrl
    if (!obj.bucket || !obj.objectKey) return null

    try {
      const signed = await this.storageAdapter.getSignedDownloadUrl(
        obj.bucket,
        obj.objectKey,
        3600,
      )
      return signed
    } catch {
      const { data, error } = await supabase.storage
        .from(obj.bucket)
        .createSignedUrl(obj.objectKey, 3600)
      if (error || !data?.signedUrl) return null
      return data.signedUrl
    }
  }

  async deleteStorageObject(bucket: string, objectKey: string): Promise<void> {
    return this.storageAdapter.deleteObject(bucket, objectKey)
  }
}

