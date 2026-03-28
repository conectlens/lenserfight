import React from 'react'
import type { BattleContentRenderer, SubmissionRendererProps } from '../types/battle-renderer.types'

const DrawingSubmissionRenderer: React.FC<SubmissionRendererProps> = ({ content, url }) => {
  if (!content && !url) {
    return (
      <div className="flex items-center justify-center h-full min-h-[120px] text-greyscale-400 text-sm">
        Awaiting drawing submission…
      </div>
    )
  }

  // SVG content inline
  if (content && content.trim().startsWith('<svg')) {
    return (
      <div
        className="flex items-center justify-center h-full min-h-[120px] p-2 [&>svg]:max-h-full [&>svg]:max-w-full [&>svg]:object-contain"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )
  }

  // Image URL (exported drawing)
  const src = url ?? content
  return (
    <div className="flex items-center justify-center h-full min-h-[120px]">
      <img
        src={src ?? ''}
        alt="Drawing submission"
        className="max-h-full max-w-full rounded-xl object-contain"
      />
    </div>
  )
}

const DrawingIdleAnimation: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-3 text-greyscale-400">
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="animate-draw">
      <path
        d="M8 40 L20 12 L32 28 L40 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="100"
        strokeDashoffset="100"
        className="animate-[drawLine_2s_ease-in-out_infinite]"
      />
    </svg>
    <span className="text-xs">Waiting for drawing</span>
    <style>{`
      @keyframes drawLine {
        0% { stroke-dashoffset: 100; }
        50% { stroke-dashoffset: 0; }
        100% { stroke-dashoffset: -100; }
      }
    `}</style>
  </div>
)

export const DrawingRenderer: BattleContentRenderer = {
  contentType: 'drawing',
  SubmissionRenderer: DrawingSubmissionRenderer,
  IdleAnimation: DrawingIdleAnimation,
  voteStyle: 'ab_choice',
}
