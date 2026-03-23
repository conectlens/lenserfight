import type { StorageAdapterPort, StorageListItem } from './storage.types'

interface InMemoryObject {
  key: string
  data: Uint8Array
  createdAt: string
}

// TODO: Replace in-memory Map with IndexedDB for persistence across sessions
const store = new Map<string, InMemoryObject>()

function bucketKey(bucket: string, objectKey: string): string {
  return `${bucket}/${objectKey}`
}

export class LocalFileStorageAdapter implements StorageAdapterPort {
  async createSignedUploadUrl(
    bucket: string,
    objectKey: string
  ): Promise<{ signedUrl: string; token: string }> {
    const token = crypto.randomUUID()
    const signedUrl = `local://upload/${bucket}/${objectKey}?token=${token}`

    // TODO: Move to IndexedDB-backed storage
    store.set(bucketKey(bucket, objectKey), {
      key: objectKey,
      data: new Uint8Array(),
      createdAt: new Date().toISOString(),
    })

    return { signedUrl, token }
  }

  async deleteObject(bucket: string, objectKey: string): Promise<void> {
    store.delete(bucketKey(bucket, objectKey))
  }

  getPublicUrl(bucket: string, objectKey: string): string {
    // TODO: Return a blob URL from IndexedDB once implemented
    return `local://public/${bucket}/${objectKey}`
  }

  async getSignedDownloadUrl(
    bucket: string,
    objectKey: string,
    _expiresIn?: number
  ): Promise<string> {
    const entry = store.get(bucketKey(bucket, objectKey))
    if (!entry) {
      throw new Error(`Object not found: ${bucket}/${objectKey}`)
    }
    // TODO: Return a blob URL from IndexedDB once implemented
    return `local://download/${bucket}/${objectKey}`
  }

  async listObjects(
    bucket: string,
    prefix: string,
    limit?: number
  ): Promise<StorageListItem[]> {
    const fullPrefix = `${bucket}/${prefix}`
    const items: StorageListItem[] = []

    for (const [key, value] of store.entries()) {
      if (key.startsWith(fullPrefix)) {
        items.push({
          name: value.key,
          id: null,
          size: value.data.byteLength,
          createdAt: value.createdAt,
        })
      }
    }

    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return limit ? items.slice(0, limit) : items
  }
}
