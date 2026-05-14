import type { ICacheMetadataStore } from '../interfaces/metadata'

export interface StalenessMonitorOptions {
  metadataStore: ICacheMetadataStore
  sweepIntervalMs: number
  onStale: (assetId: string) => void
}

export class StalenessMonitor {
  private readonly options: StalenessMonitorOptions
  private handle: ReturnType<typeof setInterval> | null = null

  constructor(options: StalenessMonitorOptions) {
    this.options = options
  }

  start(): void {
    if (this.handle) return
    if (typeof globalThis.setInterval !== 'function') return
    this.handle = setInterval(() => {
      void this.sweep()
    }, this.options.sweepIntervalMs)
  }

  stop(): void {
    if (this.handle) {
      clearInterval(this.handle)
      this.handle = null
    }
  }

  async sweep(): Promise<void> {
    try {
      const expired = await this.options.metadataStore.getExpiredEntries(Date.now())
      for (const meta of expired) {
        if (meta.state === 'persistent-cached' || meta.state === 'memory-cached') {
          meta.state = 'stale'
          await this.options.metadataStore.setMetadata(meta.assetId, meta)
          this.options.onStale(meta.assetId)
        }
      }
    } catch {
      // Sweep failures are non-fatal.
    }
  }
}
