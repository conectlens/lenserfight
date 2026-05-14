import type { IAssetCacheProvider } from '../interfaces/provider'
import type { CacheEntry } from '../types/cache-entry'
import type { RuntimeContext } from '../types/lifecycle'

export class EdgeCacheProvider implements IAssetCacheProvider {
  readonly runtime: RuntimeContext = 'edge-cloudflare'
  private readonly map = new Map<string, CacheEntry>()

  async get(key: string): Promise<CacheEntry | null> {
    return this.map.get(key) ?? null
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    this.map.set(key, { ...entry, blob: undefined, objectUrl: undefined })
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key)
  }

  async clear(): Promise<void> {
    this.map.clear()
  }

  async has(key: string): Promise<boolean> {
    return this.map.has(key)
  }

  dispose(): void {
    this.map.clear()
  }
}
