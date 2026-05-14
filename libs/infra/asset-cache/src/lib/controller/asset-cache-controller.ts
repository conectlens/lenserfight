import type { AssetCategory } from '@lenserfight/utils/cdn-url'
import type { AssetCacheConfig } from '../config/asset-cache-config'
import type { ICDNProvider } from '../interfaces/cdn'
import type { IAssetCacheProvider } from '../interfaces/provider'
import type { IRuntimeDetector } from '../interfaces/runtime'
import type {
  AssetCacheMeta,
  CacheEntry,
} from '../types/cache-entry'
import type {
  AssetLifecycleEvent,
  AssetLifecycleEventType,
} from '../types/events'
import type {
  AssetFormatName,
  Unsubscribe,
} from '../types/lifecycle'
import type { AssetManifestEntry } from '../types/manifest'
import { AssetIntegrityError, AssetCacheError } from '../types/errors'
import { AssetResolver } from '../services/asset-resolver'
import { InvalidationEngine } from '../services/invalidation-engine'
import { ManifestSynchronizer } from '../services/manifest-synchronizer'
import { SRIRegistry } from '../services/sri-registry'
import { CacheMetadataStore } from '../stores/cache-metadata-store'

type EventHandler = (event: AssetLifecycleEvent) => void

export interface AssetCacheControllerOptions {
  config: AssetCacheConfig
  provider: IAssetCacheProvider
  cdn: ICDNProvider
  manifest: ManifestSynchronizer
  metadataStore: CacheMetadataStore
  invalidation: InvalidationEngine
  sri: SRIRegistry
  resolver: AssetResolver
  runtime: IRuntimeDetector
}

export class AssetCacheController {
  private readonly options: AssetCacheControllerOptions
  private readonly handlers = new Map<AssetLifecycleEventType, Set<EventHandler>>()
  private readonly inflightFetches = new Map<string, Promise<CacheEntry>>()
  private disposed = false

  constructor(options: AssetCacheControllerOptions) {
    this.options = options
  }

  async resolveEntry(
    assetId: string,
    format?: AssetFormatName,
  ): Promise<CacheEntry> {
    if (this.disposed) {
      throw new AssetCacheError('disposed', 'AssetCacheController has been disposed')
    }
    const manifestEntry = await this.options.manifest.resolve(assetId, format)
    if (!manifestEntry) {
      return this.offlineFallback(assetId, format)
    }

    const key = this.options.resolver.toNamespacedKey(
      manifestEntry.category,
      manifestEntry.contentHash || manifestEntry.assetId,
    )

    if (!this.options.config.dev.bypassCache) {
      const cached = await this.options.provider.get(key)
      if (cached) {
        this.emit({ type: 'cache-hit', assetId, layer: 'memory' })
        void this.options.metadataStore.recordHit(assetId)
        return cached
      }
    }

    const inflight = this.inflightFetches.get(key)
    if (inflight) return inflight

    const promise = this.fetchAndStore(manifestEntry, key)
    this.inflightFetches.set(key, promise)
    try {
      return await promise
    } finally {
      this.inflightFetches.delete(key)
    }
  }

  async prefetch(assetId: string): Promise<void> {
    try {
      await this.resolveEntry(assetId)
    } catch {
      // Prefetch errors are non-fatal.
    }
  }

  async prefetchGroup(groupName: string): Promise<void> {
    const entries = this.options.manifest.listByGroup(groupName)
    for (const entry of entries) {
      this.emit({ type: 'prefetched', assetId: entry.assetId, groupName })
      void this.prefetch(entry.assetId)
    }
  }

  async invalidate(assetId: string): Promise<void> {
    const manifestEntry = await this.options.manifest.resolve(assetId)
    await this.options.invalidation.invalidate(assetId)
    if (manifestEntry) {
      const key = this.options.resolver.toNamespacedKey(
        manifestEntry.category,
        manifestEntry.contentHash || manifestEntry.assetId,
      )
      await this.options.provider.delete(key)
    }
    this.emit({ type: 'invalidated', assetId, reason: 'explicit' })
  }

  async invalidateCategory(category: AssetCategory): Promise<void> {
    await this.options.invalidation.invalidateCategory(category)
    const entries = this.options.manifest.listByCategory(category)
    for (const entry of entries) {
      const key = this.options.resolver.toNamespacedKey(
        entry.category,
        entry.contentHash || entry.assetId,
      )
      await this.options.provider.delete(key)
    }
  }

  on(event: AssetLifecycleEventType, handler: EventHandler): Unsubscribe {
    let set = this.handlers.get(event)
    if (!set) {
      set = new Set()
      this.handlers.set(event, set)
    }
    set.add(handler)
    return () => {
      this.handlers.get(event)?.delete(handler)
    }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.handlers.clear()
    this.inflightFetches.clear()
    this.options.invalidation.dispose()
    this.options.manifest.dispose()
    this.options.provider.dispose?.()
  }

  private emit(event: AssetLifecycleEvent): void {
    const set = this.handlers.get(event.type)
    if (!set) return
    for (const handler of set) {
      try {
        handler(event)
      } catch {
        // Listener errors must not break other listeners.
      }
    }
  }

  private async fetchAndStore(
    manifestEntry: AssetManifestEntry,
    key: string,
  ): Promise<CacheEntry> {
    const category = manifestEntry.category
    const categoryConfig = this.options.config.categories[category]
    const url = this.options.resolver.normalize(manifestEntry.url)
    this.emit({ type: 'cache-miss', assetId: manifestEntry.assetId })

    try {
      const response = await this.options.cdn.fetch(url, {
        expectedMimeType: manifestEntry.mimeType.split('/')[0],
        maxResponseBytes: categoryConfig?.maxResponseSizeBytes,
        cacheTags: categoryConfig?.cacheTags,
      })

      if (categoryConfig?.sriEnabled && manifestEntry.integrity) {
        await this.options.sri.validateResponse(
          manifestEntry.assetId,
          url,
          response,
          manifestEntry.integrity,
        )
      }

      const blob = await response.blob()
      const objectUrl =
        typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
          ? URL.createObjectURL(blob)
          : undefined

      const meta: AssetCacheMeta = {
        assetId: manifestEntry.assetId,
        url,
        state: 'persistent-cached',
        etag: response.headers.get('etag') ?? undefined,
        sizeBytes: blob.size,
        hitCount: 0,
        lastAccessed: Date.now(),
        expiresAt: Date.now() + this.expiresInMs(manifestEntry),
        category,
        contentHash: manifestEntry.contentHash,
        manifestVersion: this.options.manifest.getVersion() ?? 'unknown',
      }

      const entry: CacheEntry = {
        assetId: manifestEntry.assetId,
        url,
        blob,
        objectUrl,
        meta,
      }

      await this.options.provider.set(key, entry)
      await this.options.metadataStore.setMetadata(manifestEntry.assetId, meta)
      return entry
    } catch (err) {
      if (err instanceof AssetIntegrityError) {
        this.emit({ type: 'sri-mismatch', assetId: manifestEntry.assetId, url })
        await this.options.invalidation.invalidate(manifestEntry.assetId)
      }
      return this.offlineFallback(manifestEntry.assetId)
    }
  }

  private async offlineFallback(
    assetId: string,
    _format?: AssetFormatName,
  ): Promise<CacheEntry> {
    const fallbackId = this.resolveFallbackId(assetId)
    this.emit({
      type: 'offline-fallback',
      assetId,
      fallbackAssetId: fallbackId ?? '',
    })

    const fallback = fallbackId
      ? await this.options.manifest.resolve(fallbackId)
      : null

    const url = fallback?.url ?? ''
    const meta: AssetCacheMeta = {
      assetId,
      url,
      state: 'offline-fallback',
      sizeBytes: 0,
      hitCount: 0,
      lastAccessed: Date.now(),
      expiresAt: 0,
      category: fallback?.category ?? 'public-static',
      contentHash: fallback?.contentHash ?? '',
      manifestVersion: this.options.manifest.getVersion() ?? 'unknown',
    }

    return {
      assetId,
      url,
      meta,
    }
  }

  private resolveFallbackId(assetId: string): string | null {
    const override = this.options.config.offline.assetFallbackOverrides?.[assetId]
    if (override) return override
    const fromManifest = this.options.manifest.getManifest()?.entries.find((e) => e.assetId === assetId)
    if (fromManifest?.fallbackAssetId) return fromManifest.fallbackAssetId
    if (fromManifest) {
      const catFallback = this.options.config.categories[fromManifest.category].offlineFallbackAssetId
      if (catFallback) return catFallback
      const registryFallback = this.options.config.offline.fallbackRegistry?.[fromManifest.category]
      if (registryFallback) return registryFallback
    }
    return null
  }

  private expiresInMs(entry: AssetManifestEntry): number {
    switch (entry.ttlTier) {
      case 'immutable-1y':
        return 365 * 24 * 3600 * 1000
      case 'static-30d':
        return 30 * 24 * 3600 * 1000
      case 'semi-7d':
        return 7 * 24 * 3600 * 1000
      case 'semi-24h':
        return 24 * 3600 * 1000
      case 'semi-1h':
        return 3600 * 1000
      case 'dynamic-no-store':
        return 0
      default:
        return this.options.config.memoryCache.defaultTTLMs
    }
  }
}
