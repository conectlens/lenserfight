import type { StorageAdapterPort, StorageListItem } from './storage.types'

const NOT_IMPLEMENTED =
  'Cloudflare R2 storage adapter is not yet implemented. Use "supabase" or "local" adapter.'

export class CloudflareR2StorageAdapter implements StorageAdapterPort {
  async createSignedUploadUrl(
    _bucket: string,
    _objectKey: string
  ): Promise<{ signedUrl: string; token: string }> {
    throw new Error(NOT_IMPLEMENTED)
  }

  async deleteObject(_bucket: string, _objectKey: string): Promise<void> {
    throw new Error(NOT_IMPLEMENTED)
  }

  getPublicUrl(_bucket: string, _objectKey: string): string {
    throw new Error(NOT_IMPLEMENTED)
  }

  async getSignedDownloadUrl(
    _bucket: string,
    _objectKey: string,
    _expiresIn?: number
  ): Promise<string> {
    throw new Error(NOT_IMPLEMENTED)
  }

  async listObjects(
    _bucket: string,
    _prefix: string,
    _limit?: number
  ): Promise<StorageListItem[]> {
    throw new Error(NOT_IMPLEMENTED)
  }
}
