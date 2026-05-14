import type { InvalidationReason } from './lifecycle'

export type AssetLifecycleEvent =
  | { type: 'cache-hit'; assetId: string; layer: 'memory' | 'sw' | 'http' | 'edge' }
  | { type: 'cache-miss'; assetId: string }
  | { type: 'revalidated'; assetId: string; changed: boolean }
  | { type: 'invalidated'; assetId: string; reason: InvalidationReason }
  | { type: 'offline-fallback'; assetId: string; fallbackAssetId: string }
  | { type: 'sri-mismatch'; assetId: string; url: string }
  | { type: 'prefetched'; assetId: string; groupName: string }
  | { type: 'evicted'; assetId: string; reason: 'lru' | 'ttl' | 'size-pressure' }

export type AssetLifecycleEventType = AssetLifecycleEvent['type']
