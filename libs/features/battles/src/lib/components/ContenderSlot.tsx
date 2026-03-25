import React from 'react'
import { motion } from 'framer-motion'
import { SubmissionViewer } from './SubmissionViewer'

interface ContenderSlotProps {
  slot: 'A' | 'B'
  displayName: string
  contenderType: 'human' | 'ai_model' | 'ai_agent' | 'ai_runner'
  contentText?: string | null
  contentUrl?: string | null
  voteCount?: number
  votePercentage?: number
}

export function ContenderSlot({
  slot,
  displayName,
  contenderType,
  contentText,
  contentUrl,
  voteCount,
  votePercentage,
}: ContenderSlotProps) {
  const isAI = contenderType !== 'human'
  const barColor = slot === 'A' ? 'var(--cl-status-blue)' : 'var(--cl-yellow-600)'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--cl-surface-text-disabled)]">{isAI ? '🤖' : '👤'}</span>
        <span className="text-xs text-[var(--cl-surface-text-muted)] font-medium">{displayName}</span>
        {voteCount !== undefined && (
          <span className="ml-auto text-xs text-[var(--cl-surface-text-disabled)]">{voteCount} votes</span>
        )}
      </div>

      {votePercentage !== undefined && (
        <div className="h-1.5 bg-[var(--cl-surface-sunken)] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: barColor }}
            initial={{ width: '0%' }}
            animate={{ width: `${votePercentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      )}

      <SubmissionViewer
        slot={slot}
        contenderName={displayName}
        contentText={contentText}
        contentUrl={contentUrl}
      />
    </div>
  )
}
