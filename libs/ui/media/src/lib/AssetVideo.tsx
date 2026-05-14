import type { AssetFormatName, AssetPriority } from '@lenserfight/infra/asset-cache'
import React from 'react'
import { VideoPlayer } from './VideoPlayer'
import { useAsset } from './useAsset'

export interface AssetVideoProps {
  assetId: string
  posterAssetId?: string
  name?: string | null
  durationSeconds?: number | null
  className?: string
  priority?: AssetPriority
  format?: AssetFormatName
  mimeType?: string
  fallback?: React.ReactNode
  disabled?: boolean
}

export function AssetVideo({
  assetId,
  posterAssetId,
  name,
  durationSeconds,
  className = '',
  priority = 'lazy',
  format,
  mimeType,
  fallback,
  disabled,
}: AssetVideoProps) {
  const { src, state, isLoading } = useAsset(assetId, { format, priority, disabled })
  const { src: posterSrc } = useAsset(posterAssetId ?? '', {
    disabled: !posterAssetId,
    priority: 'eager',
  })

  if (isLoading && fallback) return <>{fallback}</>
  if (!src) return fallback ? <>{fallback}</> : null

  return (
    <div data-asset-state={state} data-asset-id={assetId}>
      <VideoPlayer
        src={src}
        name={name}
        durationSeconds={durationSeconds}
        poster={posterSrc}
        className={className}
        mimeType={mimeType}
      />
    </div>
  )
}
