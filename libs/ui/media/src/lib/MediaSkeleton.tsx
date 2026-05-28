import React from 'react'

export interface MediaSkeletonProps {
  aspectRatio?: '16/9' | '1/1' | 'waveform'
  className?: string
}

export function MediaSkeleton({ aspectRatio = '16/9', className = '' }: MediaSkeletonProps) {
  if (aspectRatio === 'waveform') {
    return (
      <div className={`flex items-center gap-0.5 h-10 px-2 ${className}`} aria-hidden>
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-full bg-greyscale-200 dark:bg-greyscale-800 animate-pulse"
            style={{ height: `${20 + Math.sin(i * 0.7) * 12}px` }}
          />
        ))}
      </div>
    )
  }

  const paddingMap: Record<string, string> = {
    '16/9': 'aspect-video',
    '1/1':  'aspect-square',
  }

  return (
    <div
      className={`w-full rounded-lg overflow-hidden bg-greyscale-100 dark:bg-greyscale-900 animate-pulse ${paddingMap[aspectRatio] ?? 'aspect-video'} ${className}`}
      aria-hidden
    />
  )
}
