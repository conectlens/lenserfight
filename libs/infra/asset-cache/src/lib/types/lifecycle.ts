export type AssetLifecycleState =
  | 'uncached'
  | 'fetching'
  | 'memory-cached'
  | 'persistent-cached'
  | 'stale'
  | 'revalidating'
  | 'invalidated'
  | 'expired'
  | 'offline-fallback'
  | 'preloaded'

export type TTLTier =
  | 'immutable-1y'
  | 'static-30d'
  | 'semi-7d'
  | 'semi-24h'
  | 'semi-1h'
  | 'dynamic-no-store'

export type InvalidationReason =
  | 'explicit'
  | 'version-mismatch'
  | 'ttl-expired'
  | 'event-triggered'
  | 'sri-mismatch'
  | 'sw-update'

export type RuntimeContext =
  | 'browser'
  | 'ssr-node'
  | 'edge-cloudflare'
  | 'localhost-dev'
  | 'electron'
  | 'pwa'

export type AssetPriority = 'critical' | 'eager' | 'lazy'

export type AssetFormatName = 'webp' | 'avif' | 'webm' | 'mp4' | 'original'

export type Unsubscribe = () => void
