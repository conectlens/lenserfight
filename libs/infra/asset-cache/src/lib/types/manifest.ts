import type { AssetCategory } from '@lenserfight/utils/cdn-url'
import type { AssetFormatName, TTLTier } from './lifecycle'

export interface AssetFormat {
  format: AssetFormatName
  url: string
  sizeBytes: number
  integrity: string
}

export interface AssetManifestEntry {
  assetId: string
  url: string
  contentHash: string
  integrity: string
  mimeType: string
  sizeBytes: number
  category: AssetCategory
  ttlTier: TTLTier
  groups: string[]
  formats: AssetFormat[]
  fallbackAssetId?: string
}

export interface AssetManifest {
  version: string
  generatedAt: string
  environment: 'production' | 'staging' | 'local'
  entries: AssetManifestEntry[]
}
