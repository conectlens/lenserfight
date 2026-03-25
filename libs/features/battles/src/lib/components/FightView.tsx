import React from 'react'
import { motion } from 'framer-motion'
import { VSIndicator } from '@lenserfight/ui/widgets'
import type { Contender, Submission, VoteAggregate, BattleUIPhase } from '../types/battle.types'

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
    <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* VS badge centered */}
      <div className="hidden md:block">
        <VSIndicator />
      </div>

      {/* Contender A */}
      {contenderA ? (
        <motion.div
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
            voteCount: showVotes ? (aggA?.raw_vote_count ?? 0) : undefined,
            votePercentage: showVotes ? pctA : undefined,
          })}
        </motion.div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 flex items-center justify-center text-gray-400 text-sm">
          No contender A
        </div>
      )}

      {/* Contender B */}
      {contenderB ? (
        <motion.div
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
            voteCount: showVotes ? (aggB?.raw_vote_count ?? 0) : undefined,
            votePercentage: showVotes ? pctB : undefined,
          })}
        </motion.div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 flex items-center justify-center text-gray-400 text-sm">
          No contender B
        </div>
      )}
    </div>
  )
}
