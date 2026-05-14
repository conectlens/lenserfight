import type { ICacheMetadataStore } from '../interfaces/metadata'
import type { AssetCacheMeta } from '../types/cache-entry'
import type { AssetLifecycleState } from '../types/lifecycle'

const DB_NAME = 'lf-asset-cache-meta'
const DB_VERSION = 1
const STORE_NAME = 'asset_cache_meta'

function isIndexedDBAvailable(): boolean {
  return typeof globalThis !== 'undefined' && typeof (globalThis as { indexedDB?: unknown }).indexedDB !== 'undefined'
}

export class CacheMetadataStore implements ICacheMetadataStore {
  private dbPromise: Promise<IDBDatabase> | null = null
  private readonly fallback = new Map<string, AssetCacheMeta>()
  private readonly useFallback: boolean

  constructor() {
    this.useFallback = !isIndexedDBAvailable()
  }

  async ready(): Promise<void> {
    if (this.useFallback) return
    await this.open()
  }

  async getMetadata(assetId: string): Promise<AssetCacheMeta | null> {
    if (this.useFallback) {
      return this.fallback.get(assetId) ?? null
    }
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(assetId)
      req.onsuccess = () => resolve((req.result as AssetCacheMeta | undefined) ?? null)
      req.onerror = () => reject(req.error)
    })
  }

  async setMetadata(assetId: string, meta: AssetCacheMeta): Promise<void> {
    if (this.useFallback) {
      this.fallback.set(assetId, meta)
      return
    }
    const db = await this.open()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const req = tx.objectStore(STORE_NAME).put(meta)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }

  async deleteMetadata(assetId: string): Promise<void> {
    if (this.useFallback) {
      this.fallback.delete(assetId)
      return
    }
    const db = await this.open()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const req = tx.objectStore(STORE_NAME).delete(assetId)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }

  async getExpiredEntries(before: number): Promise<AssetCacheMeta[]> {
    if (this.useFallback) {
      return [...this.fallback.values()].filter((m) => m.expiresAt < before)
    }
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const out: AssetCacheMeta[] = []
      const tx = db.transaction(STORE_NAME, 'readonly')
      const idx = tx.objectStore(STORE_NAME).index('by_expires_at')
      const range = IDBKeyRange.upperBound(before, true)
      const req = idx.openCursor(range)
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor) {
          out.push(cursor.value as AssetCacheMeta)
          cursor.continue()
        } else {
          resolve(out)
        }
      }
      req.onerror = () => reject(req.error)
    })
  }

  async getByState(state: AssetLifecycleState): Promise<AssetCacheMeta[]> {
    if (this.useFallback) {
      return [...this.fallback.values()].filter((m) => m.state === state)
    }
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const out: AssetCacheMeta[] = []
      const tx = db.transaction(STORE_NAME, 'readonly')
      const idx = tx.objectStore(STORE_NAME).index('by_state')
      const req = idx.openCursor(IDBKeyRange.only(state))
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor) {
          out.push(cursor.value as AssetCacheMeta)
          cursor.continue()
        } else {
          resolve(out)
        }
      }
      req.onerror = () => reject(req.error)
    })
  }

  async recordHit(assetId: string): Promise<void> {
    const meta = await this.getMetadata(assetId)
    if (!meta) return
    meta.hitCount += 1
    meta.lastAccessed = Date.now()
    await this.setMetadata(assetId, meta)
  }

  async cleanup(retainExpiredBefore: number, retainInvalidatedBefore: number): Promise<number> {
    let removed = 0
    if (this.useFallback) {
      for (const [id, meta] of [...this.fallback.entries()]) {
        if (meta.expiresAt < retainExpiredBefore) {
          this.fallback.delete(id)
          removed++
        } else if (meta.state === 'invalidated' && meta.lastAccessed < retainInvalidatedBefore) {
          this.fallback.delete(id)
          removed++
        }
      }
      return removed
    }
    const expired = await this.getExpiredEntries(retainExpiredBefore)
    const invalidated = await this.getByState('invalidated')
    const old = invalidated.filter((m) => m.lastAccessed < retainInvalidatedBefore)
    for (const meta of expired) {
      await this.deleteMetadata(meta.assetId)
      removed++
    }
    for (const meta of old) {
      await this.deleteMetadata(meta.assetId)
      removed++
    }
    return removed
  }

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise
    this.dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'assetId' })
          store.createIndex('by_expires_at', 'expiresAt')
          store.createIndex('by_state', 'state')
          store.createIndex('by_category', 'category')
          store.createIndex('by_category_state', ['category', 'state'])
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
      req.onblocked = () => reject(new Error('IndexedDB blocked'))
    })
    return this.dbPromise
  }
}
