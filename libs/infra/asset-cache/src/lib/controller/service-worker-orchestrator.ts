import type { SWConfig } from '../config/asset-cache-config'

export interface ServiceWorkerOrchestratorOptions {
  config: SWConfig
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void
  onActivated?: (registration: ServiceWorkerRegistration) => void
  logger?: (level: 'info' | 'warn' | 'error', msg: string, ctx?: unknown) => void
}

export class ServiceWorkerOrchestrator {
  private readonly options: ServiceWorkerOrchestratorOptions
  private registration: ServiceWorkerRegistration | null = null
  private disposed = false

  constructor(options: ServiceWorkerOrchestratorOptions) {
    this.options = options
  }

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serviceWorker' in navigator
  }

  async register(): Promise<ServiceWorkerRegistration | null> {
    if (this.disposed || !this.options.config.enabled) return null
    if (!this.isSupported()) return null
    try {
      const registration = await navigator.serviceWorker.register(
        this.options.config.scriptPath,
        { scope: this.options.config.scope },
      )
      this.registration = registration

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing
        if (!installing) return
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            this.options.onUpdateAvailable?.(registration)
            if (this.options.config.autoSkipWaiting) {
              this.postMessage({ type: 'SKIP_WAITING' })
            }
          }
        })
      })

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this.options.onActivated?.(registration)
      })

      return registration
    } catch (err) {
      this.options.logger?.('warn', 'Service worker registration failed', err)
      return null
    }
  }

  async unregister(): Promise<boolean> {
    if (!this.registration) return false
    const result = await this.registration.unregister()
    this.registration = null
    return result
  }

  postMessage(message: unknown): void {
    if (!this.isSupported()) return
    const controller = navigator.serviceWorker.controller
    if (controller) controller.postMessage(message)
    else if (this.registration?.waiting) this.registration.waiting.postMessage(message)
  }

  notifyManifestVersion(version: string): void {
    this.postMessage({ type: 'UPDATE_MANIFEST', version })
  }

  prefetchGroup(groupName: string, urls: string[]): void {
    this.postMessage({ type: 'PREFETCH_GROUP', groupName, urls })
  }

  invalidateAsset(assetId: string, url: string): void {
    this.postMessage({ type: 'INVALIDATE_ASSET', assetId, url })
  }

  dispose(): void {
    this.disposed = true
    this.registration = null
  }
}
