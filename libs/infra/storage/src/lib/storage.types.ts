export interface StorageAdapterPort {
  createSignedUploadUrl(bucket: string, objectKey: string): Promise<{ signedUrl: string; token: string }>
  deleteObject(bucket: string, objectKey: string): Promise<void>
  getPublicUrl(bucket: string, objectKey: string): string
  getSignedDownloadUrl(bucket: string, objectKey: string, expiresIn?: number): Promise<string>
  listObjects(bucket: string, prefix: string, limit?: number): Promise<StorageListItem[]>
}

export interface StorageListItem {
  name: string
  id: string | null
  size: number
  createdAt: string
}

export type StorageAdapterId = 'supabase' | 'local' | 'r2'
