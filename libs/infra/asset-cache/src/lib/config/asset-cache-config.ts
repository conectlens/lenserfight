import type { AssetCategory } from '@lenserfight/utils/cdn-url'
import type { TTLTier } from '../types/lifecycle'

export type SWStrategy =
  | 'cache-first'
  | 'stale-while-revalidate'
  | 'network-first'
  | 'network-only'

export interface CategoryConfig {
  ttl: TTLTier
  memoryMaxEntries: number
  memoryCeilingBytes: number
  maxResponseSizeBytes: number
  swStrategy: SWStrategy
  precacheEligible: boolean
  offlineFallbackAssetId: string | null
  sriEnabled: boolean
  cacheTags: string[]
}

export interface MemoryCacheConfig {
  maxSizeBytes: number
  defaultTTLMs: number
  maxEntries: number
  storeBlobs: boolean
}

export interface SWConfig {
  enabled: boolean
  scope: string
  scriptPath: string
  precacheGroups: string[]
  manifestPollIntervalMs: number
  autoSkipWaiting: boolean
  oldNamespaceRetentionMs: number
}

export interface PrefetchConfig {
  enabled: boolean
  minBandwidthForLazy: '3g' | '4g'
  minBandwidthForEager: '2g' | '3g' | '4g'
  viewportMargin: string
  maxConcurrency: number
  routeTransitionLeadMs: number
  routeGroups?: Record<string, string[]>
}

export interface OfflineConfig {
  enabled: boolean
  fallbackRegistry?: Partial<Record<AssetCategory, string>>
  assetFallbackOverrides?: Record<string, string>
  probeUrl: string
  onlineProbeIntervalMs: number
  offlineProbeIntervalMs: number
  probeTimeoutMs: number
}

export interface SecurityConfig {
  signedUrlSecret?: string
  sriEnabled: boolean
  sriAlgorithm: 'sha256' | 'sha384' | 'sha512'
  corsAllowedOrigins?: string[]
  signedUrlMaxAgeSeconds: number
  signedUrlIpBound: boolean
}

export interface DevConfig {
  bypassCache: boolean
  logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug' | 'verbose'
  inspectorEnabled: boolean
  simulateNetwork?: '2g' | '3g' | '4g' | 'offline'
  simulateRuntime?: string
}

export interface AssetCacheConfig {
  cdnBaseUrl: string
  environment: 'production' | 'staging' | 'local'
  manifestUrl: string
  categories: Record<AssetCategory, CategoryConfig>
  memoryCache: MemoryCacheConfig
  serviceWorker: SWConfig
  prefetch: PrefetchConfig
  offline: OfflineConfig
  security: SecurityConfig
  dev: DevConfig
}
