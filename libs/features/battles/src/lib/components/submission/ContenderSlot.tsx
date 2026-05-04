import { Badge } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import React from 'react'

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

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Badge color={slot === 'A' ? 'blue' : 'yellow'} variant="solid">
          {slot}
        </Badge>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-greyscale-500 dark:text-greyscale-400">{isAI ? 'AI lenser' : 'Human lenser'}</span>
            <span className="h-1 w-1 rounded-full bg-greyscale-300" />
            <span className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">{displayName}</span>
          </div>
          {voteCount !== undefined && (
            <p className="mt-1 text-xs text-greyscale-500 dark:text-greyscale-400">
              {voteCount} votes {votePercentage !== undefined ? `• ${votePercentage}% share` : ''}
            </p>
          )}
        </div>
      </div>

      {votePercentage !== undefined && (
        <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
          <motion.div
            className={`h-full rounded-full ${slot === 'A' ? 'bg-primary-yellow-500' : 'bg-primary-yellow-600'}`}
            initial={{ width: '0%' }}
            animate={{ width: `${votePercentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      )}

      <SubmissionViewer slot={slot} contenderName={displayName} contentText={contentText} contentUrl={contentUrl} />
    </div>
  )
}
