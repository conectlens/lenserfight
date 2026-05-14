import type { AssetFormatName, AssetPriority } from '@lenserfight/infra/asset-cache'
import React from 'react'
import { ProgressiveImage } from './ProgressiveImage'
import { useAsset } from './useAsset'

export interface AssetImageProps {
  assetId: string
  alt?: string
  className?: string
  priority?: AssetPriority
  format?: AssetFormatName
  fallback?: React.ReactNode
  aspectRatio?: '16/9' | '1/1'
  thumbnailSrc?: string | null
  disabled?: boolean
}

export function AssetImage({
  assetId,
  alt = '',
  className = '',
  priority = 'eager',
  format,
  fallback,
  aspectRatio = '16/9',
  thumbnailSrc,
  disabled,
}: AssetImageProps) {
  const { src, state, isLoading } = useAsset(assetId, {
    format,
    priority,
    disabled,
  })

  if (isLoading && fallback) {
    return <>{fallback}</>
  }

  if (!src) return fallback ? <>{fallback}</> : null

  return (
    <div data-asset-state={state} data-asset-id={assetId}>
      <ProgressiveImage
        src={src}
        alt={alt}
        className={className}
        aspectRatio={aspectRatio}
        thumbnailSrc={thumbnailSrc ?? null}
      />
    </div>
  )
}
