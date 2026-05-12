import { ImageOff } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { MediaSkeleton } from './MediaSkeleton'

export interface ProgressiveImageProps {
  src: string
  thumbnailSrc?: string | null
  alt?: string
  className?: string
  aspectRatio?: '16/9' | '1/1'
}

export function ProgressiveImage({
  src,
  thumbnailSrc,
  alt = '',
  className = '',
  aspectRatio = '16/9',
}: ProgressiveImageProps) {
  const [stage, setStage] = useState<'skeleton' | 'thumb' | 'full' | 'error'>('skeleton')
  const fullRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    // Load thumbnail first (or skip straight to full if no thumbnail)
    const initial = thumbnailSrc ?? src
    const img = new Image()
    img.onload = () => setStage(thumbnailSrc ? 'thumb' : 'full')
    img.onerror = () => setStage('error')
    img.src = initial
  }, [src, thumbnailSrc])

  useEffect(() => {
    if (stage !== 'thumb') return
    const img = new Image()
    img.onload = () => setStage('full')
    img.onerror = () => setStage('error')
    img.src = src
  }, [stage, src])

  const aspectClass = aspectRatio === '1/1' ? 'aspect-square' : 'aspect-video'

  if (stage === 'skeleton') {
    return <MediaSkeleton aspectRatio={aspectRatio} className={className} />
  }

  if (stage === 'error') {
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-greyscale-100 dark:bg-greyscale-900 text-greyscale-400 ${aspectClass} ${className}`}
      >
        <ImageOff className="h-6 w-6" />
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden rounded-lg ${aspectClass} ${className}`}>
      {stage === 'thumb' && thumbnailSrc && (
        <img
          src={thumbnailSrc}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover blur-sm scale-105 transition-opacity"
          aria-hidden
        />
      )}
      <img
        ref={fullRef}
        src={src}
        alt={alt}
        className={[
          'absolute inset-0 w-full h-full object-cover transition-opacity duration-500',
          stage === 'full' ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />
    </div>
  )
}
