import type { AssetCategory } from '@lenserfight/utils/cdn-url'
import type { ICDNProvider } from '../interfaces/cdn'
import type { IAssetRegistry } from '../interfaces/registry'
import type { AssetFormatName, Unsubscribe } from '../types/lifecycle'
import type { AssetManifest, AssetManifestEntry } from '../types/manifest'
import { SRIRegistry } from './sri-registry'

export interface ManifestSynchronizerOptions {
  manifestUrl: string
  cdn: ICDNProvider
  pollIntervalMs: number
  sriRegistry?: SRIRegistry
  initial?: AssetManifest | null
}

export class ManifestSynchronizer implements IAssetRegistry {
  private manifest: AssetManifest | null
  private readonly options: ManifestSynchronizerOptions
  private readonly versionListeners = new Set<(v: string) => void>()
  private pollHandle: ReturnType<typeof setInterval> | null = null
  private inflight: Promise<AssetManifest | null> | null = null
  private byId = new Map<string, AssetManifestEntry>()
  private byCategory = new Map<AssetCategory, AssetManifestEntry[]>()
  private byGroup = new Map<string, AssetManifestEntry[]>()

  constructor(options: ManifestSynchronizerOptions) {
    this.options = options
    this.manifest = options.initial ?? null
    if (this.manifest) this.indexManifest(this.manifest)
  }

  async resolve(assetId: string, format?: AssetFormatName): Promise<AssetManifestEntry | null> {
    const entry = this.byId.get(assetId) ?? null
    if (!entry || !format) return entry
    const variant = entry.formats.find((f) => f.format === format)
    if (!variant) return entry
    return {
      ...entry,
      url: variant.url,
      integrity: variant.integrity,
      sizeBytes: variant.sizeBytes,
    }
  }

  getManifest(): AssetManifest | null {
    return this.manifest
  }

  getVersion(): string | null {
    return this.manifest?.version ?? null
  }

  async prefetchGroup(_groupName: string): Promise<void> {
    // Controller calls this — implementation handled by AssetCacheController.
    // Kept as a no-op here to satisfy IAssetRegistry while keeping responsibility
    // separation: ManifestSynchronizer indexes, it does not fetch assets.
  }

  onVersionChange(handler: (newVersion: string) => void): Unsubscribe {
    this.versionListeners.add(handler)
    return () => {
      this.versionListeners.delete(handler)
    }
  }

  listByCategory(category: AssetCategory): AssetManifestEntry[] {
    return this.byCategory.get(category) ?? []
  }

  listByGroup(groupName: string): AssetManifestEntry[] {
    return this.byGroup.get(groupName) ?? []
  }

  async refresh(): Promise<AssetManifest | null> {
    if (this.inflight) return this.inflight
    this.inflight = (async () => {
      try {
        const res = await this.options.cdn.fetch(this.options.manifestUrl, {
          expectedMimeType: 'application/json',
          maxResponseBytes: 5 * 1024 * 1024,
        })
        if (!res.ok) return this.manifest
        const next = (await res.json()) as AssetManifest
        return this.applyManifest(next)
      } catch {
        return this.manifest
      } finally {
        this.inflight = null
      }
    })()
    return this.inflight
  }

  startPolling(): void {
    if (this.pollHandle) return
    if (typeof globalThis.setInterval !== 'function') return
    if (!this.manifest) {
      void this.refresh()
    }
    this.pollHandle = setInterval(() => {
      void this.refresh()
    }, this.options.pollIntervalMs)
  }

  stopPolling(): void {
    if (this.pollHandle) {
      clearInterval(this.pollHandle)
      this.pollHandle = null
    }
  }

  dispose(): void {
    this.stopPolling()
    this.versionListeners.clear()
  }

  private applyManifest(next: AssetManifest | null): AssetManifest | null {
    if (!next || !next.version) return this.manifest
    const prevVersion = this.manifest?.version ?? null
    this.manifest = next
    this.indexManifest(next)
    if (prevVersion !== next.version) {
      for (const handler of this.versionListeners) {
        try {
          handler(next.version)
        } catch {
          // Listener errors must not stop other listeners.
        }
      }
    }
    return next
  }

  private indexManifest(manifest: AssetManifest): void {
    this.byId = new Map()
    this.byCategory = new Map()
    this.byGroup = new Map()
    for (const entry of manifest.entries) {
      this.byId.set(entry.assetId, entry)
      const catList = this.byCategory.get(entry.category) ?? []
      catList.push(entry)
      this.byCategory.set(entry.category, catList)
      for (const group of entry.groups) {
        const groupList = this.byGroup.get(group) ?? []
        groupList.push(entry)
        this.byGroup.set(group, groupList)
      }
      if (this.options.sriRegistry && entry.integrity) {
        this.options.sriRegistry.register(entry.assetId, entry.integrity)
      }
    }
  }
}
