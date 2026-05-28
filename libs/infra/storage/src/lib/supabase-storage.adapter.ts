import { supabase } from '@lenserfight/data/supabase'
import type { StorageAdapterPort, StorageListItem } from './storage.types'
import { browserLogger } from '@lenserfight/utils/logger'

export class SupabaseStorageAdapter implements StorageAdapterPort {
  async createSignedUploadUrl(
    bucket: string,
    objectKey: string
  ): Promise<{ signedUrl: string; token: string }> {
    const startedAt = Date.now()
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(objectKey)

    if (error || !data) {
      browserLogger.error('supabase storage upload url failed', {
        component: 'SupabaseStorageAdapter',
        operation: 'createSignedUploadUrl',
        bucket,
        objectKey,
        durationMs: Date.now() - startedAt,
        error: error?.message ?? 'Unknown error',
      })
      throw new Error(`Failed to create signed upload URL: ${error?.message ?? 'Unknown error'}`)
    }

    browserLogger.info('supabase storage upload url created', {
      component: 'SupabaseStorageAdapter',
      operation: 'createSignedUploadUrl',
      bucket,
      objectKey,
      durationMs: Date.now() - startedAt,
    })

    return { signedUrl: data.signedUrl, token: data.token }
  }

  async deleteObject(bucket: string, objectKey: string): Promise<void> {
    const startedAt = Date.now()
    const { error } = await supabase.storage
      .from(bucket)
      .remove([objectKey])

    if (error) {
      browserLogger.error('supabase storage delete failed', {
        component: 'SupabaseStorageAdapter',
        operation: 'deleteObject',
        bucket,
        objectKey,
        durationMs: Date.now() - startedAt,
        error: error.message,
      })
      throw new Error(`Failed to delete object: ${error.message}`)
    }

    browserLogger.info('supabase storage object deleted', {
      component: 'SupabaseStorageAdapter',
      operation: 'deleteObject',
      bucket,
      objectKey,
      durationMs: Date.now() - startedAt,
    })
  }

  getPublicUrl(bucket: string, objectKey: string): string {
    return supabase.storage
      .from(bucket)
      .getPublicUrl(objectKey).data.publicUrl
  }

  async getSignedDownloadUrl(
    bucket: string,
    objectKey: string,
    expiresIn?: number
  ): Promise<string> {
    const startedAt = Date.now()
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectKey, expiresIn ?? 3600)

    if (error || !data) {
      browserLogger.error('supabase storage download url failed', {
        component: 'SupabaseStorageAdapter',
        operation: 'getSignedDownloadUrl',
        bucket,
        objectKey,
        durationMs: Date.now() - startedAt,
        error: error?.message ?? 'Unknown error',
      })
      throw new Error(`Failed to create signed download URL: ${error?.message ?? 'Unknown error'}`)
    }

    browserLogger.info('supabase storage download url created', {
      component: 'SupabaseStorageAdapter',
      operation: 'getSignedDownloadUrl',
      bucket,
      objectKey,
      durationMs: Date.now() - startedAt,
    })

    return data.signedUrl
  }

  async listObjects(
    bucket: string,
    prefix: string,
    limit?: number
  ): Promise<StorageListItem[]> {
    const startedAt = Date.now()
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, {
        limit,
        sortBy: { column: 'created_at', order: 'desc' },
      })

    if (error || !data) {
      browserLogger.error('supabase storage list failed', {
        component: 'SupabaseStorageAdapter',
        operation: 'listObjects',
        bucket,
        prefix,
        limit: limit ?? null,
        durationMs: Date.now() - startedAt,
        error: error?.message ?? 'Unknown error',
      })
      throw new Error(`Failed to list objects: ${error?.message ?? 'Unknown error'}`)
    }

    browserLogger.info('supabase storage objects listed', {
      component: 'SupabaseStorageAdapter',
      operation: 'listObjects',
      bucket,
      prefix,
      limit: limit ?? null,
      count: data.length,
      durationMs: Date.now() - startedAt,
    })

    return data.map((item) => ({
      name: item.name,
      id: item.id ?? null,
      size: item.metadata?.size ?? 0,
      createdAt: item.created_at ?? '',
    }))
  }
}
