import type { AssetCategory } from '@lenserfight/utils/cdn-url'
import type { AssetLifecycleState } from './lifecycle'

export interface AssetCacheMeta {
  assetId: string
  url: string
  state: AssetLifecycleState
  etag?: string
  sizeBytes: number
  hitCount: number
  lastAccessed: number
  expiresAt: number
  category: AssetCategory
  contentHash: string
  manifestVersion: string
}

export interface CacheEntry {
  assetId: string
  url: string
  blob?: Blob
  objectUrl?: string
  meta: AssetCacheMeta
}

export interface CacheNamespaceConfig {
  name: string
  version: number
  category?: AssetCategory
  maxEntries: number
  maxSizeBytes: number
  ttlMs: number
}
