import React from 'react'
import type { BattleContentRenderer, SubmissionRendererProps } from '../types/battle-renderer.types'

const CodeSubmissionRenderer: React.FC<SubmissionRendererProps> = ({ content, metadata }) => {
  if (!content) {
    return (
      <div className="flex items-center justify-center h-full min-h-[120px] text-greyscale-400 text-sm">
        Awaiting code submission…
      </div>
    )
  }

  const language = (metadata?.language as string) ?? 'plaintext'

  return (
    <div className="relative h-full min-h-[120px] overflow-auto rounded-xl bg-greyscale-950 p-4">
      {language !== 'plaintext' && (
        <span className="absolute top-2 right-3 text-[10px] font-mono text-greyscale-500 uppercase tracking-wider">
          {language}
        </span>
      )}
      <pre className="text-sm leading-relaxed font-mono text-greyscale-100 whitespace-pre-wrap break-words">
        <code>{content}</code>
      </pre>
    </div>
  )
}

const CodeIdleAnimation: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-3 text-greyscale-400">
    <div className="w-48 rounded-xl bg-greyscale-950 p-3 font-mono text-xs leading-5">
      <div className="flex gap-1.5 mb-2">
        <span className="h-2 w-2 rounded-full bg-red-500/60" />
        <span className="h-2 w-2 rounded-full bg-yellow-500/60" />
        <span className="h-2 w-2 rounded-full bg-green-500/60" />
      </div>
      <div className="h-2 w-24 rounded bg-greyscale-800 animate-pulse mb-1.5" />
      <div className="h-2 w-32 rounded bg-greyscale-800 animate-pulse mb-1.5" style={{ animationDelay: '0.1s' }} />
      <div className="h-2 w-20 rounded bg-greyscale-800 animate-pulse" style={{ animationDelay: '0.2s' }} />
      <span className="inline-block w-1.5 h-3.5 bg-greyscale-400 animate-pulse ml-0.5" />
    </div>
    <span className="text-xs">Waiting for code</span>
  </div>
)

export const CodeRenderer: BattleContentRenderer = {
  contentType: 'code',
  SubmissionRenderer: CodeSubmissionRenderer,
  IdleAnimation: CodeIdleAnimation,
  voteStyle: 'ab_choice',
}
