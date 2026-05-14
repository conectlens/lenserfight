import type { AssetCacheMeta } from '../types/cache-entry'
import type { AssetLifecycleState } from '../types/lifecycle'

export interface ICacheMetadataStore {
  getMetadata(assetId: string): Promise<AssetCacheMeta | null>
  setMetadata(assetId: string, meta: AssetCacheMeta): Promise<void>
  deleteMetadata(assetId: string): Promise<void>
  getExpiredEntries(before: number): Promise<AssetCacheMeta[]>
  getByState(state: AssetLifecycleState): Promise<AssetCacheMeta[]>
  recordHit(assetId: string): Promise<void>
  ready(): Promise<void>
}
