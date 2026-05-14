import type { OfflineConfig } from '../config/asset-cache-config'

export type OfflineListener = (online: boolean) => void

export interface OfflineDetectorOptions {
  config: OfflineConfig
  fetchImpl?: typeof fetch
}

export class OfflineDetector {
  private readonly options: OfflineDetectorOptions
  private readonly listeners = new Set<OfflineListener>()
  private probeHandle: ReturnType<typeof setTimeout> | null = null
  private lastProbeSucceeded = true
  private disposed = false

  constructor(options: OfflineDetectorOptions) {
    this.options = options
  }

  get isOnline(): boolean {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false
    return this.lastProbeSucceeded
  }

  start(): void {
    if (this.disposed) return
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline)
      window.addEventListener('offline', this.handleOffline)
    }
    this.scheduleProbe()
  }

  on(listener: OfflineListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  dispose(): void {
    this.disposed = true
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline)
      window.removeEventListener('offline', this.handleOffline)
    }
    if (this.probeHandle) {
      clearTimeout(this.probeHandle)
      this.probeHandle = null
    }
    this.listeners.clear()
  }

  private readonly handleOnline = (): void => {
    void this.probe()
  }

  private readonly handleOffline = (): void => {
    this.setOnline(false)
  }

  private scheduleProbe(): void {
    if (this.disposed) return
    if (typeof globalThis.setTimeout !== 'function') return
    const delay = this.isOnline
      ? this.options.config.onlineProbeIntervalMs
      : this.options.config.offlineProbeIntervalMs
    this.probeHandle = setTimeout(() => {
      void this.probe()
    }, delay)
  }

  private async probe(): Promise<void> {
    if (this.disposed) return
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch?.bind(globalThis)
    if (!fetchImpl) return
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.options.config.probeTimeoutMs)
      const res = await fetchImpl(this.options.config.probeUrl, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      })
      clearTimeout(timeout)
      this.setOnline(res.ok)
    } catch {
      this.setOnline(false)
    } finally {
      this.scheduleProbe()
    }
  }

  private setOnline(online: boolean): void {
    if (this.lastProbeSucceeded === online) return
    this.lastProbeSucceeded = online
    for (const listener of this.listeners) {
      try {
        listener(online)
      } catch {
        // Ignore listener errors.
      }
    }
  }
}
