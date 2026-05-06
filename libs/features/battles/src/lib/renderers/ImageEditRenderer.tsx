import React, { useCallback, useRef, useState } from 'react'
import type { BattleContentRenderer, SubmissionRendererProps } from '../types/battle-renderer.types'

const ImageEditSubmissionRenderer: React.FC<SubmissionRendererProps> = ({ url, metadata }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [sliderPos, setSliderPos] = useState(50)
  const originalUrl = (metadata?.original_url as string) ?? null
  const editedUrl = url

  if (!editedUrl) {
    return (
      <div className="flex items-center justify-center h-full min-h-[120px] text-greyscale-400 text-sm">
        Awaiting image edit submission…
      </div>
    )
  }

  // If no original, show edited image only
  if (!originalUrl) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <img
          src={editedUrl}
          alt="Edited image"
          className="max-h-full max-w-full rounded-xl object-contain shadow-lg"
        />
      </div>
    )
  }

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      setSliderPos(Math.max(0, Math.min(100, x)))
    },
    []
  )

  // Before/after slider comparison
  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-[200px] overflow-hidden rounded-xl cursor-col-resize select-none"
      onMouseMove={handleMove}
    >
      {/* Original (full width, clipped by slider) */}
      <img
        src={originalUrl}
        alt="Original"
        className="absolute inset-0 h-full w-full object-contain"
      />

      {/* Edited (clipped from left) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
      >
        <img
          src={editedUrl}
          alt="Edited"
          className="h-full w-full object-contain"
        />
      </div>

      {/* Slider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 8H12M4 8L6 6M4 8L6 10M12 8L10 6M12 8L10 10" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <span className="absolute top-2 left-2 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] text-white font-medium z-10">
        Original
      </span>
      <span className="absolute top-2 right-2 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] text-white font-medium z-10">
        Edited
      </span>
    </div>
  )
}

const ImageEditIdleAnimation: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-3 text-greyscale-400">
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-10 w-10 rounded-lg bg-greyscale-800 animate-pulse"
          style={{
            animationDelay: `${i * 0.2}s`,
            transform: `translateY(${i * -4}px)`,
          }}
        />
      ))}
    </div>
    <span className="text-xs">Waiting for image edit</span>
  </div>
)

export const ImageEditRenderer: BattleContentRenderer = {
  contentType: 'image_edit' as 'text',
  SubmissionRenderer: ImageEditSubmissionRenderer,
  IdleAnimation: ImageEditIdleAnimation,
  voteStyle: 'ab_choice',
}
