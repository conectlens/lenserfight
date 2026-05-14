import type { AssetCategory } from '@lenserfight/utils/cdn-url'
import type { AssetFormatName, Unsubscribe } from '../types/lifecycle'
import type { AssetManifest, AssetManifestEntry } from '../types/manifest'

export interface IAssetRegistry {
  resolve(
    assetId: string,
    format?: AssetFormatName,
  ): Promise<AssetManifestEntry | null>
  getManifest(): AssetManifest | null
  getVersion(): string | null
  prefetchGroup(groupName: string): Promise<void>
  onVersionChange(handler: (newVersion: string) => void): Unsubscribe
  listByCategory(category: AssetCategory): AssetManifestEntry[]
  listByGroup(groupName: string): AssetManifestEntry[]
}
