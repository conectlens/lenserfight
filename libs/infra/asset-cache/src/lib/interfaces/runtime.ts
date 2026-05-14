import type { RuntimeContext } from '../types/lifecycle'

export type EffectiveConnectionType = '2g' | '3g' | '4g' | 'slow-2g' | 'unknown'

export interface IRuntimeDetector {
  readonly context: RuntimeContext
  readonly isServiceWorkerAvailable: boolean
  readonly isIndexedDBAvailable: boolean
  readonly isCacheStorageAvailable: boolean
  readonly isOnline: boolean
  readonly effectiveConnectionType: EffectiveConnectionType
}
