import type {
  AssetFormatName,
  AssetLifecycleState,
  AssetPriority,
} from '@lenserfight/infra/asset-cache'
import { useEffect, useRef, useState } from 'react'
import { useAssetContext } from './asset-context'

export interface UseAssetOptions {
  format?: AssetFormatName
  priority?: AssetPriority
  preload?: boolean
  disabled?: boolean
}

export interface UseAssetResult {
  src: string | null
  integrity: string | null
  state: AssetLifecycleState
  isLoading: boolean
  isStale: boolean
  isOfflineFallback: boolean
  prefetch: () => void
  invalidate: () => Promise<void>
}

const INITIAL_STATE: AssetLifecycleState = 'uncached'

export function useAsset(
  assetId: string,
  options: UseAssetOptions = {},
): UseAssetResult {
  const { runtime } = useAssetContext()
  const [src, setSrc] = useState<string | null>(null)
  const [integrity, setIntegrity] = useState<string | null>(null)
  const [state, setState] = useState<AssetLifecycleState>(INITIAL_STATE)
  const cancelledRef = useRef(false)

  const { format, disabled } = options

  useEffect(() => {
    cancelledRef.current = false
    if (disabled || !runtime || !assetId) {
      setSrc(null)
      setIntegrity(null)
      setState('uncached')
      return
    }

    setState('fetching')
    runtime.controller
      .resolveEntry(assetId, format)
      .then((entry) => {
        if (cancelledRef.current) return
        setSrc(entry.objectUrl ?? entry.url ?? null)
        setIntegrity(entry.meta.contentHash ? null : null)
        setState(entry.meta.state)
      })
      .catch(() => {
        if (cancelledRef.current) return
        setSrc(null)
        setState('offline-fallback')
      })

    return () => {
      cancelledRef.current = true
    }
  }, [runtime, assetId, format, disabled])

  return {
    src,
    integrity,
    state,
    isLoading: state === 'fetching' || state === 'revalidating',
    isStale: state === 'stale',
    isOfflineFallback: state === 'offline-fallback',
    prefetch: () => {
      if (runtime && assetId) void runtime.controller.prefetch(assetId)
    },
    invalidate: async () => {
      if (runtime && assetId) await runtime.controller.invalidate(assetId)
    },
  }
}
