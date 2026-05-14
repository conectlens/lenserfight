import type {
  EffectiveConnectionType,
  IRuntimeDetector,
} from '../interfaces/runtime'
import type { RuntimeContext } from '../types/lifecycle'

interface NetworkInfoLike {
  effectiveType?: string
  saveData?: boolean
}

interface NavigatorLike {
  onLine?: boolean
  connection?: NetworkInfoLike
  serviceWorker?: unknown
}

function detectContext(): RuntimeContext {
  const g = globalThis as unknown as {
    window?: { matchMedia?: unknown }
    document?: unknown
    navigator?: NavigatorLike
    WorkerGlobalScope?: unknown
    Deno?: unknown
    process?: { versions?: { node?: string; bun?: string } }
    caches?: unknown
  }

  const hasDocument = typeof g.document !== 'undefined'
  const hasWindow = typeof g.window !== 'undefined'
  const hasNavigator = typeof g.navigator !== 'undefined'

  if (hasWindow && hasDocument && hasNavigator) {
    const isStandalone =
      typeof g.window?.matchMedia === 'function'
        ? Boolean(
            (g.window as unknown as { matchMedia: (q: string) => { matches: boolean } })
              .matchMedia('(display-mode: standalone)')
              .matches,
          )
        : false
    return isStandalone ? 'pwa' : 'browser'
  }

  if (typeof (g as { caches?: unknown }).caches !== 'undefined' && !hasDocument) {
    return 'edge-cloudflare'
  }

  if (g.process?.versions?.node) {
    return 'ssr-node'
  }

  return 'browser'
}

export class BrowserRuntimeDetector implements IRuntimeDetector {
  readonly context: RuntimeContext

  constructor(forcedContext?: RuntimeContext) {
    this.context = forcedContext ?? detectContext()
  }

  get isServiceWorkerAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'serviceWorker' in navigator
  }

  get isIndexedDBAvailable(): boolean {
    return typeof globalThis !== 'undefined' && typeof (globalThis as { indexedDB?: unknown }).indexedDB !== 'undefined'
  }

  get isCacheStorageAvailable(): boolean {
    return typeof caches !== 'undefined'
  }

  get isOnline(): boolean {
    if (typeof navigator === 'undefined') return true
    const nav = navigator as NavigatorLike
    return nav.onLine !== false
  }

  get effectiveConnectionType(): EffectiveConnectionType {
    if (typeof navigator === 'undefined') return 'unknown'
    const conn = (navigator as NavigatorLike).connection
    if (!conn || !conn.effectiveType) return 'unknown'
    const t = conn.effectiveType
    if (t === 'slow-2g' || t === '2g' || t === '3g' || t === '4g') return t
    return 'unknown'
  }
}

export class NodeRuntimeDetector implements IRuntimeDetector {
  readonly context: RuntimeContext = 'ssr-node'
  readonly isServiceWorkerAvailable = false
  readonly isIndexedDBAvailable = false
  readonly isCacheStorageAvailable = false
  readonly isOnline = true
  readonly effectiveConnectionType: EffectiveConnectionType = '4g'
}
