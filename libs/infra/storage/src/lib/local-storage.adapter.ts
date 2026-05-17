import { openDB, type IDBPDatabase } from 'idb'
import type { StorageAdapterPort, StorageListItem } from './storage.types'
import { browserLogger } from '@lenserfight/utils/logger'
import { generateUUID } from '@lenserfight/utils/text'

interface StoredObject {
  compositeKey: string
  bucket: string
  objectKey: string
  data: Uint8Array
  mimeType: string
  createdAt: string
}

const DB_NAME = 'lf_storage'
const STORE_NAME = 'objects'
let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'compositeKey' })
          store.createIndex('by_bucket', 'bucket', { unique: false })
        }
      },
    })
  }
  return dbPromise
}

function compositeKey(bucket: string, objectKey: string): string {
  return `${bucket}/${objectKey}`
}

export class LocalFileStorageAdapter implements StorageAdapterPort {
  async createSignedUploadUrl(
    bucket: string,
    objectKey: string
  ): Promise<{ signedUrl: string; token: string }> {
    const startedAt = Date.now()
    const token = generateUUID()
    const db = await getDb()

    const entry: StoredObject = {
      compositeKey: compositeKey(bucket, objectKey),
      bucket,
      objectKey,
      data: new Uint8Array(),
      mimeType: 'application/octet-stream',
      createdAt: new Date().toISOString(),
    }
    await db.put(STORE_NAME, entry)

    const signedUrl = `local://upload/${bucket}/${objectKey}?token=${token}`
    browserLogger.info('local storage upload url created', {
      component: 'LocalFileStorageAdapter',
      operation: 'createSignedUploadUrl',
      bucket,
      objectKey,
      durationMs: Date.now() - startedAt,
    })
    return { signedUrl, token }
  }

  async deleteObject(bucket: string, objectKey: string): Promise<void> {
    const startedAt = Date.now()
    const db = await getDb()
    await db.delete(STORE_NAME, compositeKey(bucket, objectKey))
    browserLogger.info('local storage object deleted', {
      component: 'LocalFileStorageAdapter',
      operation: 'deleteObject',
      bucket,
      objectKey,
      durationMs: Date.now() - startedAt,
    })
  }

  getPublicUrl(bucket: string, objectKey: string): string {
    return `local://public/${bucket}/${objectKey}`
  }

  async getSignedDownloadUrl(
    bucket: string,
    objectKey: string,
    _expiresIn?: number
  ): Promise<string> {
    const startedAt = Date.now()
    const db = await getDb()
    const entry = await db.get(STORE_NAME, compositeKey(bucket, objectKey)) as StoredObject | undefined

    if (!entry || entry.data.byteLength === 0) {
      browserLogger.warn('local storage object missing or empty', {
        component: 'LocalFileStorageAdapter',
        operation: 'getSignedDownloadUrl',
        bucket,
        objectKey,
        durationMs: Date.now() - startedAt,
      })
      return `local://download/${bucket}/${objectKey}`
    }

    const blob = new Blob([entry.data], { type: entry.mimeType })
    const blobUrl = URL.createObjectURL(blob)

    browserLogger.info('local storage download url created', {
      component: 'LocalFileStorageAdapter',
      operation: 'getSignedDownloadUrl',
      bucket,
      objectKey,
      durationMs: Date.now() - startedAt,
    })
    return blobUrl
  }

  async listObjects(
    bucket: string,
    prefix: string,
    limit?: number
  ): Promise<StorageListItem[]> {
    const startedAt = Date.now()
    const db = await getDb()
    const all = await db.getAll(STORE_NAME) as StoredObject[]
    const fullPrefix = `${bucket}/${prefix}`

    let items: StorageListItem[] = all
      .filter((entry) => entry.compositeKey.startsWith(fullPrefix))
      .map((entry) => ({
        name: entry.objectKey,
        id: entry.compositeKey,
        size: entry.data.byteLength,
        createdAt: entry.createdAt,
      }))

    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    if (limit) items = items.slice(0, limit)

    browserLogger.info('local storage objects listed', {
      component: 'LocalFileStorageAdapter',
      operation: 'listObjects',
      bucket,
      prefix,
      limit: limit ?? null,
      count: items.length,
      durationMs: Date.now() - startedAt,
    })
    return items
  }

  /** Store raw bytes for a previously reserved object key (called after upload). */
  async writeObject(
    bucket: string,
    objectKey: string,
    data: Uint8Array,
    mimeType = 'application/octet-stream'
  ): Promise<void> {
    const db = await getDb()
    const key = compositeKey(bucket, objectKey)
    const existing = (await db.get(STORE_NAME, key)) as StoredObject | undefined
    await db.put(STORE_NAME, {
      compositeKey: key,
      bucket,
      objectKey,
      data,
      mimeType,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    })
  }
}
