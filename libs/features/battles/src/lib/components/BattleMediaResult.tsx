import React from 'react'
import { MediaOutputCard, type MediaOutputCardProps } from '@lenserfight/features/workflows'

// Phase AK — side-by-side media result for battle contenders A and B.
//
// Used in battle result pages when a workflow node produced a media output
// (image, video, or audio). No download button in battle context — users view
// via the proxy, not download.

export interface BattleMediaResultProps {
  slotA: MediaOutputCardProps | null
  slotB: MediaOutputCardProps | null
  className?: string
}

export function BattleMediaResult({ slotA, slotB, className }: BattleMediaResultProps) {
  if (!slotA && !slotB) return null

  return (
    <div className={['grid grid-cols-2 gap-4', className ?? ''].join(' ')}>
      {[slotA, slotB].map((slot, i) => (
        <div key={i} className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-greyscale-500 dark:text-greyscale-400">
            AI Generated
          </span>
          {slot ? (
            <MediaOutputCard {...slot} hideDownload />
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
