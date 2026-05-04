import type React from 'react'

export type BattleContentType = 'text' | 'code' | 'poem' | 'drawing' | 'image' | 'video' | 'audio' | 'workflow' | 'map' | 'avatar' | 'image_edit' | 'kaggle'

export interface SubmissionRendererProps {
  content?: string | null
  url?: string | null
  metadata?: Record<string, unknown>
  /** True when content is being streamed (live or replay) */
  isStreaming?: boolean
  /** 0-1 progress through stream (for replay scrubber) */
  streamProgress?: number
}

export interface BattleContentRenderer {
  contentType: BattleContentType
  SubmissionRenderer: React.FC<SubmissionRendererProps>
  IdleAnimation: React.FC
  voteStyle: 'ab_choice' | 'slider' | 'ranked'
}
