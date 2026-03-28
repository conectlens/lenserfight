import React from 'react'
import type { BattleContentRenderer, SubmissionRendererProps } from '../types/battle-renderer.types'

const TextSubmissionRenderer: React.FC<SubmissionRendererProps> = ({ content }) => {
  if (!content) {
    return (
      <div className="flex items-center justify-center h-full min-h-[120px] text-greyscale-400 text-sm">
        Awaiting submission…
      </div>
    )
  }
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-greyscale-900 dark:text-greyscale-50">
      {content}
    </div>
  )
}

const TextIdleAnimation: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-3 text-greyscale-400">
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-2 w-2 rounded-full bg-greyscale-300 animate-bounce dark:bg-greyscale-600"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
    <span className="text-xs">Waiting for submissions</span>
  </div>
)

export const TextRenderer: BattleContentRenderer = {
  contentType: 'text',
  SubmissionRenderer: TextSubmissionRenderer,
  IdleAnimation: TextIdleAnimation,
  voteStyle: 'ab_choice',
}
