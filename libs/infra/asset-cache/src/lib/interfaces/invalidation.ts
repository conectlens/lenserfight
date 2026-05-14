import type { AssetCategory } from '@lenserfight/utils/cdn-url'
import type { Unsubscribe } from '../types/lifecycle'

export interface IInvalidationEngine {
  invalidate(assetId: string): Promise<void>
  invalidateCategory(category: AssetCategory): Promise<void>
  invalidateByTag(tag: string): Promise<void>
  scheduleRevalidation(assetId: string, delayMs?: number): void
  onStalenessDetected(handler: (assetId: string) => void): Unsubscribe
}
