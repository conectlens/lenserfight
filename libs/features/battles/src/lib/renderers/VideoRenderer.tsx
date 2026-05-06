import React from 'react'
import type { BattleContentRenderer, SubmissionRendererProps } from '../types/battle-renderer.types'

const VideoSubmissionRenderer: React.FC<SubmissionRendererProps> = ({ url, metadata }) => {
  if (!url) {
    return (
      <div className="flex items-center justify-center h-full min-h-[120px] text-greyscale-400 text-sm">
        Awaiting video submission…
      </div>
    )
  }

  const poster = typeof metadata?.thumbnail_url === 'string' ? metadata.thumbnail_url : undefined

  return (
    <div className="w-full" style={{ aspectRatio: '16/9' }}>
      <video
        src={url}
        controls
        playsInline
        poster={poster}
        className="w-full h-full rounded-xl object-cover bg-greyscale-900"
      />
    </div>
  )
}

const VideoIdleAnimation: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-3 text-greyscale-400">
    <span className="text-2xl animate-bounce">🎬</span>
    <span className="text-xs">Waiting for video</span>
  </div>
)

export const VideoRenderer: BattleContentRenderer = {
  contentType: 'video',
  SubmissionRenderer: VideoSubmissionRenderer,
  IdleAnimation: VideoIdleAnimation,
  voteStyle: 'ab_choice',
}
