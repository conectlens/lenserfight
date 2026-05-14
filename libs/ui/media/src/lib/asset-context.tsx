import {
  createAssetCacheRuntime,
  type AssetCacheConfig,
  type AssetCacheRuntime,
} from '@lenserfight/infra/asset-cache'
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export interface AssetContextValue {
  runtime: AssetCacheRuntime | null
  config: AssetCacheConfig | null
  isOffline: boolean
  manifestVersion: string | null
}

const AssetContext = createContext<AssetContextValue>({
  runtime: null,
  config: null,
  isOffline: false,
  manifestVersion: null,
})

export interface AssetProviderProps {
  config: AssetCacheConfig
  autoStart?: boolean
  children: React.ReactNode
}

export function AssetProvider({ config, autoStart = true, children }: AssetProviderProps) {
  const [manifestVersion, setManifestVersion] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(false)

  const runtime = useMemo(() => createAssetCacheRuntime({ config }), [config])

  useEffect(() => {
    let cancelled = false
    if (autoStart) {
      void runtime.start().catch(() => undefined)
    }
    const unsubVersion = runtime.manifest.onVersionChange((version) => {
      if (!cancelled) setManifestVersion(version)
    })
    const unsubOffline = runtime.offlineDetector.on((online) => {
      if (!cancelled) setIsOffline(!online)
    })
    return () => {
      cancelled = true
      unsubVersion()
      unsubOffline()
      runtime.dispose()
    }
  }, [runtime, autoStart])

  const value = useMemo<AssetContextValue>(
    () => ({
      runtime,
      config,
      isOffline,
      manifestVersion,
    }),
    [runtime, config, isOffline, manifestVersion],
  )

  return <AssetContext.Provider value={value}>{children}</AssetContext.Provider>
}

export function useAssetContext(): AssetContextValue {
  return useContext(AssetContext)
}
