import { supabase } from '@lenserfight/data/supabase'
import type { StorageAdapterPort, StorageListItem } from './storage.types'

export class SupabaseStorageAdapter implements StorageAdapterPort {
  async createSignedUploadUrl(
    bucket: string,
    objectKey: string
  ): Promise<{ signedUrl: string; token: string }> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(objectKey)

    if (error || !data) {
      throw new Error(`Failed to create signed upload URL: ${error?.message ?? 'Unknown error'}`)
    }

    return { signedUrl: data.signedUrl, token: data.token }
  }

  async deleteObject(bucket: string, objectKey: string): Promise<void> {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([objectKey])

    if (error) {
      throw new Error(`Failed to delete object: ${error.message}`)
    }
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
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectKey, expiresIn ?? 3600)

    if (error || !data) {
      throw new Error(`Failed to create signed download URL: ${error?.message ?? 'Unknown error'}`)
    }

    return data.signedUrl
  }

  async listObjects(
    bucket: string,
    prefix: string,
    limit?: number
  ): Promise<StorageListItem[]> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, {
        limit,
        sortBy: { column: 'created_at', order: 'desc' },
      })

    if (error || !data) {
      throw new Error(`Failed to list objects: ${error?.message ?? 'Unknown error'}`)
    }

    return data.map((item) => ({
      name: item.name,
      id: item.id ?? null,
      size: item.metadata?.size ?? 0,
      createdAt: item.created_at ?? '',
    }))
  }
}
