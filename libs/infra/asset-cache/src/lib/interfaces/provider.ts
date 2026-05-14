import type { CacheEntry } from '../types/cache-entry'
import type { RuntimeContext } from '../types/lifecycle'

export interface IAssetCacheProvider {
  readonly runtime: RuntimeContext
  get(key: string): Promise<CacheEntry | null>
  set(key: string, entry: CacheEntry): Promise<void>
  delete(key: string): Promise<void>
  clear(namespace?: string): Promise<void>
  has(key: string): Promise<boolean>
  dispose?(): void
}
