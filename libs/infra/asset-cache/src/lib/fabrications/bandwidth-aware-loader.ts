import type { IRuntimeDetector } from '../interfaces/runtime'
import type { AssetPriority } from '../types/lifecycle'

export class BandwidthAwareLoader {
  private readonly runtime: IRuntimeDetector
  private readonly minLazy: '3g' | '4g'
  private readonly minEager: '2g' | '3g' | '4g'

  constructor(
    runtime: IRuntimeDetector,
    minLazy: '3g' | '4g',
    minEager: '2g' | '3g' | '4g',
  ) {
    this.runtime = runtime
    this.minLazy = minLazy
    this.minEager = minEager
  }

  canPrefetch(priority: AssetPriority): boolean {
    if (!this.runtime.isOnline) return priority === 'critical'
    if (priority === 'critical') return true
    const t = this.runtime.effectiveConnectionType
    if (t === 'unknown') return true
    const rank: Record<string, number> = {
      'slow-2g': 0,
      '2g': 1,
      '3g': 2,
      '4g': 3,
    }
    const current = rank[t] ?? 3
    const required = priority === 'lazy' ? rank[this.minLazy] : rank[this.minEager]
    return current >= required
  }
}
