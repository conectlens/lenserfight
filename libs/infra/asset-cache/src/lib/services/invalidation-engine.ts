import type { AssetCategory } from '@lenserfight/utils/cdn-url'
import type { IInvalidationEngine } from '../interfaces/invalidation'
import type { ICacheMetadataStore } from '../interfaces/metadata'
import type { Unsubscribe } from '../types/lifecycle'

type AssetCommand =
  | { kind: 'invalidate'; assetId: string }
  | { kind: 'invalidateCategory'; category: AssetCategory }
  | { kind: 'invalidateByTag'; tag: string }

export interface InvalidationEngineOptions {
  metadataStore: ICacheMetadataStore
  onInvalidate?: (assetId: string) => void
  onCategoryInvalidate?: (category: AssetCategory) => void
  resolveTag?: (tag: string) => Promise<string[]>
}

export class InvalidationEngine implements IInvalidationEngine {
  private readonly stalenessListeners = new Set<(assetId: string) => void>()
  private readonly options: InvalidationEngineOptions
  private readonly schedulingMap = new Map<string, ReturnType<typeof setTimeout>>()

  constructor(options: InvalidationEngineOptions) {
    this.options = options
  }

  async invalidate(assetId: string): Promise<void> {
    return this.dispatch({ kind: 'invalidate', assetId })
  }

  async invalidateCategory(category: AssetCategory): Promise<void> {
    return this.dispatch({ kind: 'invalidateCategory', category })
  }

  async invalidateByTag(tag: string): Promise<void> {
    return this.dispatch({ kind: 'invalidateByTag', tag })
  }

  scheduleRevalidation(assetId: string, delayMs = 0): void {
    if (typeof globalThis.setTimeout !== 'function') return
    const existing = this.schedulingMap.get(assetId)
    if (existing) clearTimeout(existing)
    const handle = setTimeout(() => {
      this.schedulingMap.delete(assetId)
      this.notifyStale(assetId)
    }, delayMs)
    this.schedulingMap.set(assetId, handle)
  }

  onStalenessDetected(handler: (assetId: string) => void): Unsubscribe {
    this.stalenessListeners.add(handler)
    return () => {
      this.stalenessListeners.delete(handler)
    }
  }

  notifyStale(assetId: string): void {
    for (const handler of this.stalenessListeners) {
      try {
        handler(assetId)
      } catch {
        // Listener errors must not stop other listeners.
      }
    }
  }

  dispose(): void {
    for (const handle of this.schedulingMap.values()) clearTimeout(handle)
    this.schedulingMap.clear()
    this.stalenessListeners.clear()
  }

  private async dispatch(cmd: AssetCommand): Promise<void> {
    if (cmd.kind === 'invalidate') {
      const meta = await this.options.metadataStore.getMetadata(cmd.assetId)
      if (meta) {
        meta.state = 'invalidated'
        meta.expiresAt = 0
        await this.options.metadataStore.setMetadata(cmd.assetId, meta)
      }
      this.options.onInvalidate?.(cmd.assetId)
      return
    }
    if (cmd.kind === 'invalidateCategory') {
      this.options.onCategoryInvalidate?.(cmd.category)
      return
    }
    if (cmd.kind === 'invalidateByTag') {
      const ids = (await this.options.resolveTag?.(cmd.tag)) ?? []
      await Promise.all(ids.map((id) => this.invalidate(id)))
    }
  }
}
