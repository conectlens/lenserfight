import type { AssetCategory } from '@lenserfight/utils/cdn-url'
import type { ICacheStorageAdapter, IOpenCache } from '../interfaces/storage-adapters'

function namespaceFor(version: string | number, category: AssetCategory): string {
  return `lf-v${version}-${category}`
}

export class BrowserCacheStorageAdapter implements ICacheStorageAdapter {
  async open(cacheName: string): Promise<IOpenCache> {
    if (typeof caches === 'undefined') {
      throw new Error('CacheStorage API is not available')
    }
    const cache = await caches.open(cacheName)
    return {
      match: (req) => cache.match(req),
      put: (req, res) => cache.put(req, res),
      delete: (req) => cache.delete(req),
      keys: () => cache.keys(),
    }
  }

  async delete(cacheName: string): Promise<boolean> {
    if (typeof caches === 'undefined') return false
    return caches.delete(cacheName)
  }

  async keys(): Promise<string[]> {
    if (typeof caches === 'undefined') return []
    return caches.keys()
  }

  async has(cacheName: string): Promise<boolean> {
    if (typeof caches === 'undefined') return false
    return caches.has(cacheName)
  }
}

export class NoopCacheStorageAdapter implements ICacheStorageAdapter {
  private readonly stores = new Map<string, Map<string, Response>>()

  async open(cacheName: string): Promise<IOpenCache> {
    let store = this.stores.get(cacheName)
    if (!store) {
      store = new Map()
      this.stores.set(cacheName, store)
    }
    const s = store
    return {
      match: async (req) => {
        const key = typeof req === 'string' ? req : req.url
        const res = s.get(key)
        return res ? res.clone() : undefined
      },
      put: async (req, res) => {
        const key = typeof req === 'string' ? req : req.url
        s.set(key, res.clone())
      },
      delete: async (req) => {
        const key = typeof req === 'string' ? req : req.url
        return s.delete(key)
      },
    }
  }

  async delete(cacheName: string): Promise<boolean> {
    return this.stores.delete(cacheName)
  }

  async keys(): Promise<string[]> {
    return [...this.stores.keys()]
  }

  async has(cacheName: string): Promise<boolean> {
    return this.stores.has(cacheName)
  }
}

export interface PersistentCacheStoreOptions {
  adapter: ICacheStorageAdapter
  manifestVersion: () => string
}

export class PersistentCacheStore {
  private readonly adapter: ICacheStorageAdapter
  private readonly versionFn: () => string

  constructor(options: PersistentCacheStoreOptions) {
    this.adapter = options.adapter
    this.versionFn = options.manifestVersion
  }

  async match(url: string, category: AssetCategory): Promise<Response | undefined> {
    const cache = await this.openNamespace(category)
    return cache.match(url)
  }

  async put(url: string, category: AssetCategory, response: Response): Promise<void> {
    const cache = await this.openNamespace(category)
    await cache.put(url, response)
  }

  async delete(url: string, category: AssetCategory): Promise<boolean> {
    const cache = await this.openNamespace(category)
    return cache.delete(url)
  }

  async clearCategory(category: AssetCategory): Promise<void> {
    await this.adapter.delete(namespaceFor(this.versionFn(), category))
  }

  async purgeOldNamespaces(currentVersion: string): Promise<number> {
    const all = await this.adapter.keys()
    let removed = 0
    for (const name of all) {
      const match = /^lf-v([^-]+)-/.exec(name)
      if (!match) continue
      if (match[1] !== String(currentVersion)) {
        if (await this.adapter.delete(name)) removed++
      }
    }
    return removed
  }

  private async openNamespace(category: AssetCategory): Promise<IOpenCache> {
    return this.adapter.open(namespaceFor(this.versionFn(), category))
  }
}
