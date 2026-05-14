import type { AssetCacheConfig } from '../config/asset-cache-config'
import type { IAssetCacheProvider } from '../interfaces/provider'
import type { IRuntimeDetector } from '../interfaces/runtime'
import {
  BrowserCacheStorageAdapter,
  NoopCacheStorageAdapter,
} from '../stores/persistent-cache-store'
import { PersistentCacheStore } from '../stores/persistent-cache-store'
import { MemoryCacheStore } from '../stores/memory-cache-store'
import { CacheMetadataStore } from '../stores/cache-metadata-store'
import { BrowserCacheProvider } from './browser-cache-provider'
import { LocalhostCacheProvider } from './localhost-cache-provider'
import { SSRCacheProvider } from './ssr-cache-provider'
import { EdgeCacheProvider } from './edge-cache-provider'

export interface RuntimeBundle {
  provider: IAssetCacheProvider
  memory: MemoryCacheStore
  metadata: CacheMetadataStore
  persistent?: PersistentCacheStore
}

export interface RuntimeContextControllerOptions {
  config: AssetCacheConfig
  detector: IRuntimeDetector
  manifestVersion: () => string
}

export class RuntimeContextController {
  static create(options: RuntimeContextControllerOptions): RuntimeBundle {
    const { config, detector } = options
    const memory = new MemoryCacheStore({
      config: config.memoryCache,
      categories: config.categories,
    })
    const metadata = new CacheMetadataStore()

    const context = detector.context

    if (context === 'ssr-node') {
      return {
        provider: new SSRCacheProvider(),
        memory,
        metadata,
      }
    }

    if (context === 'edge-cloudflare') {
      return {
        provider: new EdgeCacheProvider(),
        memory,
        metadata,
      }
    }

    if (context === 'localhost-dev') {
      return {
        provider: new LocalhostCacheProvider(),
        memory,
        metadata,
      }
    }

    const adapter = detector.isCacheStorageAvailable
      ? new BrowserCacheStorageAdapter()
      : new NoopCacheStorageAdapter()
    const persistent = new PersistentCacheStore({
      adapter,
      manifestVersion: options.manifestVersion,
    })

    return {
      provider: new BrowserCacheProvider({
        memory,
        metadata,
        persistent,
        runtime: context,
      }),
      memory,
      metadata,
      persistent,
    }
  }
}
