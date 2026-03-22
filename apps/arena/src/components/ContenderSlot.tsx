import React from 'react'
import { SubmissionViewer } from './SubmissionViewer'

interface ContenderSlotProps {
  slot: 'A' | 'B'
  displayName: string
  contenderType: 'human' | 'ai_model' | 'ai_agent' | 'ai_runner'
  contentText?: string | null
  contentUrl?: string | null
  voteCount?: number
}

export function ContenderSlot({ slot, displayName, contenderType, contentText, contentUrl, voteCount }: ContenderSlotProps) {
  const isAI = contenderType !== 'human'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">{isAI ? '🤖' : '👤'}</span>
        <span className="text-xs text-gray-500 font-medium">{displayName}</span>
        {voteCount !== undefined && (
          <span className="ml-auto text-xs text-gray-400">{voteCount} votes</span>
        )}
      </div>
      <SubmissionViewer
        slot={slot}
        contenderName={displayName}
        contentText={contentText}
        contentUrl={contentUrl}
      />
    </div>
  )
}
