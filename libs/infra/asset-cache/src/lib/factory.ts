import type { AssetCacheConfig } from './config/asset-cache-config'
import type { AssetManifest } from './types/manifest'
import { AssetCacheController } from './controller/asset-cache-controller'
import { BackgroundRefreshScheduler } from './controller/background-refresh-scheduler'
import { BrowserRuntimeDetector } from './controller/runtime-detector'
import { ServiceWorkerOrchestrator } from './controller/service-worker-orchestrator'
import { OfflineDetector } from './fabrications/offline-detector'
import { StalenessMonitor } from './fabrications/staleness-monitor'
import { BandwidthAwareLoader } from './fabrications/bandwidth-aware-loader'
import type { IRuntimeDetector } from './interfaces/runtime'
import { RuntimeContextController } from './providers/runtime-context-controller'
import { AssetResolver } from './services/asset-resolver'
import { CloudflareCDNProvider } from './services/cdn-gateway'
import { InvalidationEngine } from './services/invalidation-engine'
import { ManifestSynchronizer } from './services/manifest-synchronizer'
import { SRIRegistry } from './services/sri-registry'

export interface AssetCacheRuntime {
  controller: AssetCacheController
  manifest: ManifestSynchronizer
  invalidation: InvalidationEngine
  sri: SRIRegistry
  scheduler: BackgroundRefreshScheduler
  stalenessMonitor: StalenessMonitor
  offlineDetector: OfflineDetector
  serviceWorker: ServiceWorkerOrchestrator
  bandwidth: BandwidthAwareLoader
  runtime: IRuntimeDetector
  start(): Promise<void>
  dispose(): void
}

export interface CreateAssetCacheRuntimeOptions {
  config: AssetCacheConfig
  runtime?: IRuntimeDetector
  initialManifest?: AssetManifest | null
}

export function createAssetCacheRuntime(
  options: CreateAssetCacheRuntimeOptions,
): AssetCacheRuntime {
  const { config } = options
  const runtime = options.runtime ?? new BrowserRuntimeDetector()

  const sri = new SRIRegistry()
  const cdn = new CloudflareCDNProvider()
  const manifest = new ManifestSynchronizer({
    manifestUrl: config.manifestUrl,
    cdn,
    pollIntervalMs: config.serviceWorker.manifestPollIntervalMs,
    sriRegistry: sri,
    initial: options.initialManifest ?? null,
  })

  const bundle = RuntimeContextController.create({
    config,
    detector: runtime,
    manifestVersion: () => manifest.getVersion() ?? 'init',
  })

  const invalidation = new InvalidationEngine({
    metadataStore: bundle.metadata,
    resolveTag: async (tag) => {
      const all = manifest.getManifest()?.entries ?? []
      return all
        .filter((entry) => config.categories[entry.category].cacheTags.includes(tag))
        .map((entry) => entry.assetId)
    },
  })

  const resolver = new AssetResolver(config.environment)
  const controller = new AssetCacheController({
    config,
    provider: bundle.provider,
    cdn,
    manifest,
    metadataStore: bundle.metadata,
    invalidation,
    sri,
    resolver,
    runtime,
  })

  const scheduler = new BackgroundRefreshScheduler({
    maxConcurrency: 10,
    batchIntervalMs: 200,
    maxAttempts: 3,
    backoffBaseMs: 1_000,
    refresh: async (assetId) => {
      await controller.prefetch(assetId)
    },
    canRun: () => runtime.isOnline,
  })

  const stalenessMonitor = new StalenessMonitor({
    metadataStore: bundle.metadata,
    sweepIntervalMs: 5 * 60_000,
    onStale: (assetId) => scheduler.enqueue(assetId),
  })

  const offlineDetector = new OfflineDetector({ config: config.offline })

  const serviceWorker = new ServiceWorkerOrchestrator({
    config: config.serviceWorker,
  })

  const bandwidth = new BandwidthAwareLoader(
    runtime,
    config.prefetch.minBandwidthForLazy,
    config.prefetch.minBandwidthForEager,
  )

  invalidation.onStalenessDetected((assetId) => scheduler.enqueue(assetId))

  return {
    controller,
    manifest,
    invalidation,
    sri,
    scheduler,
    stalenessMonitor,
    offlineDetector,
    serviceWorker,
    bandwidth,
    runtime,
    async start() {
      await bundle.metadata.ready().catch(() => undefined)
      manifest.startPolling()
      stalenessMonitor.start()
      if (config.offline.enabled) offlineDetector.start()
      if (config.serviceWorker.enabled) {
        void serviceWorker.register()
      }
      bundle.memory.startBackgroundSweep()
    },
    dispose() {
      controller.dispose()
      scheduler.dispose()
      stalenessMonitor.stop()
      offlineDetector.dispose()
      serviceWorker.dispose()
      bundle.memory.dispose()
    },
  }
}
