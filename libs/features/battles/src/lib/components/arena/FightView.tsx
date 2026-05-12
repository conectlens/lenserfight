import { VSIndicator } from '@lenserfight/ui/widgets'
import { motion } from 'framer-motion'
import React from 'react'

import type { Contender, Submission, VoteAggregate, BattleUIPhase } from '../../types/battle.types'

// Local re-export of arena components to avoid circular deps
// These are imported from apps/arena via relative path in the feature shell
interface ContenderSlotProps {
  slot: 'A' | 'B'
  displayName: string
  contenderType: Contender['contender_type']
  contentText?: string | null
  contentUrl?: string | null
  voteCount?: number
  votePercentage?: number
  mediaUrl?: string | null
  mimeType?: string | null
  outputModality?: 'text' | 'image' | 'video' | 'audio' | null
}

interface FightViewProps {
  contenderA?: Contender
  contenderB?: Contender
  submissionA?: Submission
  submissionB?: Submission
  aggregates?: VoteAggregate[]
  phase: BattleUIPhase
  renderContenderSlot: (props: ContenderSlotProps) => React.ReactNode
}

export function FightView({
  contenderA,
  contenderB,
  submissionA,
  submissionB,
  aggregates = [],
  phase,
  renderContenderSlot,
}: FightViewProps) {
  const aggA = contenderA ? aggregates.find((v) => v.contender_id === contenderA.id) : undefined
  const aggB = contenderB ? aggregates.find((v) => v.contender_id === contenderB.id) : undefined

  const total = (aggA?.raw_vote_count ?? 0) + (aggB?.raw_vote_count ?? 0) || 1
  const pctA = Math.round(((aggA?.raw_vote_count ?? 0) / total) * 100)
  const pctB = Math.round(((aggB?.raw_vote_count ?? 0) / total) * 100)

  const showVotes = phase === 'voting' || phase === 'result'

  return (
    <div className="relative flex flex-col items-center gap-4 md:flex-row md:items-stretch">
      {/* Contender A */}
      <div className="w-full md:flex-1">
        {contenderA ? (
          <motion.div
            className="h-full"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
          >
            {renderContenderSlot({
              slot: 'A',
              displayName: contenderA.display_name,
              contenderType: contenderA.contender_type,
              contentText: submissionA?.content_text,
              contentUrl: submissionA?.content_url,
              mediaUrl: submissionA?.media_url ?? null,
              mimeType: submissionA?.mime_type ?? null,
              outputModality: submissionA?.output_modality ?? null,
              voteCount: showVotes ? (aggA?.raw_vote_count ?? 0) : undefined,
              votePercentage: showVotes ? pctA : undefined,
            })}
          </motion.div>
        ) : (
          <div className="flex h-full min-h-32 items-center justify-center rounded-2xl border border-dashed border-surface-border p-8 text-sm text-greyscale-400">
            No contender A
          </div>
        )}
      </div>

      {/* VS badge — centered between columns */}
      <div className="flex shrink-0 items-center justify-center">
        <VSIndicator />
      </div>

      {/* Contender B */}
      <div className="w-full md:flex-1">
        {contenderB ? (
          <motion.div
            className="h-full"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: [0, 0, 0.2, 1], delay: 0.05 }}
          >
            {renderContenderSlot({
              slot: 'B',
              displayName: contenderB.display_name,
              contenderType: contenderB.contender_type,
              contentText: submissionB?.content_text,
              contentUrl: submissionB?.content_url,
              mediaUrl: submissionB?.media_url ?? null,
              mimeType: submissionB?.mime_type ?? null,
              outputModality: submissionB?.output_modality ?? null,
              voteCount: showVotes ? (aggB?.raw_vote_count ?? 0) : undefined,
              votePercentage: showVotes ? pctB : undefined,
            })}
          </motion.div>
        ) : (
          <div className="flex h-full min-h-32 items-center justify-center rounded-2xl border border-dashed border-surface-border p-8 text-sm text-greyscale-400">
            No contender B
          </div>
        )}
      </div>
    </div>
  )
}
