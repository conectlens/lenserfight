import type { IAssetCacheProvider } from '../interfaces/provider'
import type { CacheEntry } from '../types/cache-entry'
import type { RuntimeContext } from '../types/lifecycle'
import { MemoryCacheStore } from '../stores/memory-cache-store'
import { CacheMetadataStore } from '../stores/cache-metadata-store'
import { PersistentCacheStore } from '../stores/persistent-cache-store'

export interface BrowserCacheProviderOptions {
  memory: MemoryCacheStore
  metadata: CacheMetadataStore
  persistent?: PersistentCacheStore
  runtime?: RuntimeContext
}

export class BrowserCacheProvider implements IAssetCacheProvider {
  readonly runtime: RuntimeContext
  private readonly memory: MemoryCacheStore
  private readonly metadata: CacheMetadataStore
  private readonly persistent?: PersistentCacheStore

  constructor(options: BrowserCacheProviderOptions) {
    this.memory = options.memory
    this.metadata = options.metadata
    this.persistent = options.persistent
    this.runtime = options.runtime ?? 'browser'
  }

  async get(key: string): Promise<CacheEntry | null> {
    const hit = this.memory.get(key)
    if (hit) return hit
    return null
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    this.memory.set(key, entry)
    if (this.persistent && entry.blob) {
      try {
        const response = new Response(entry.blob, {
          headers: { 'content-type': entry.blob.type || 'application/octet-stream' },
        })
        await this.persistent.put(entry.url, entry.meta.category, response)
      } catch {
        // Persistent cache is best-effort.
      }
    }
    await this.metadata.setMetadata(entry.assetId, entry.meta)
  }

  async delete(key: string): Promise<void> {
    this.memory.delete(key)
  }

  async clear(): Promise<void> {
    this.memory.clear()
  }

  async has(key: string): Promise<boolean> {
    return this.memory.has(key)
  }

  dispose(): void {
    this.memory.dispose()
  }
}
