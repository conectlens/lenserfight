import React, { Suspense } from 'react'
import { MediaOutputCard, type MediaOutputCardProps } from '@lenserfight/features/workflows'
import { MediaErrorBoundary, MediaSkeleton } from '@lenserfight/ui/media'

export interface BattleMediaResultProps {
  slotA: MediaOutputCardProps | null
  slotB: MediaOutputCardProps | null
  isLoading?: boolean
  className?: string
}

export function BattleMediaResult({ slotA, slotB, isLoading, className }: BattleMediaResultProps) {
  if (!slotA && !slotB && !isLoading) return null

  return (
    <div className={['grid grid-cols-2 gap-4', className ?? ''].join(' ')}>
      {[slotA, slotB].map((slot, i) => (
        <div key={i} className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-greyscale-500 dark:text-greyscale-400">
            AI Generated
          </span>
          {isLoading ? (
            <MediaSkeleton aspectRatio="16/9" />
          ) : slot ? (
            <MediaErrorBoundary>
              <Suspense fallback={<MediaSkeleton aspectRatio="16/9" />}>
                <MediaOutputCard {...slot} hideDownload />
              </Suspense>
            </MediaErrorBoundary>
          ) : (
            <div className="rounded-xl border border-dashed border-greyscale-300 dark:border-greyscale-700 h-48 flex items-center justify-center text-sm text-greyscale-400">
              No media
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
