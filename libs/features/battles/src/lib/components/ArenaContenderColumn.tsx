import React from 'react'
import type { Contender, Submission, VoteAggregate } from '../types/battle.types'
import type { BattleContentRenderer } from '../types/battle-renderer.types'
import { SubmitTextForm } from './SubmitTextForm'

interface LensAssignmentBadgeInfo {
  lens_id: string
  version_id: string | null
}

interface ArenaContenderColumnProps {
  slot: 'A' | 'B'
  contender?: Contender
  submission?: Submission
  aggregate?: VoteAggregate
  renderer: BattleContentRenderer
  totalVotes: number
  battleId?: string
  battleStatus?: string
  currentUserId?: string
  lensAssignment?: LensAssignmentBadgeInfo | null
  className?: string
}

export const ArenaContenderColumn: React.FC<ArenaContenderColumnProps> = ({
  slot,
  contender,
  submission,
  aggregate,
  renderer,
  totalVotes,
  battleId,
  battleStatus,
  currentUserId,
  lensAssignment,
  className = '',
}) => {
  const voteCount = aggregate?.raw_vote_count ?? 0
  const votePercent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0
  const { SubmissionRenderer } = renderer

  const isCurrentUserContender =
    !!currentUserId &&
    !!contender?.contender_ref_id &&
    currentUserId === contender.contender_ref_id

  const canSubmit =
    isCurrentUserContender &&
    battleStatus === 'open' &&
    !submission &&
    !!battleId &&
    !!contender

  return (
    <div className={`flex flex-col w-full md:w-0 flex-1 min-w-0 min-h-[280px] md:min-h-0 border-b border-surface-border last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 h-12 flex items-center gap-2 px-4 border-b border-surface-border">
        <div className="h-7 w-7 rounded-full bg-surface-interactive flex items-center justify-center text-xs font-black text-surface-text-muted">
          {slot}
        </div>
        <span className="text-sm font-semibold text-surface-text truncate">
          {contender?.display_name ?? '—'}
        </span>
        {isCurrentUserContender && (
          <span className="ml-1 text-[10px] font-bold text-primary">You</span>
        )}
        {lensAssignment && (
          <span className="rounded-full bg-surface-interactive px-2 py-0.5 text-[10px] font-semibold text-surface-text-muted truncate max-w-[80px]">
            lens
          </span>
        )}
        <span className="ml-auto text-xs text-surface-text-muted">
          {voteCount} vote{voteCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Submission content or submit form */}
      <div className="flex-1 overflow-y-auto p-4">
        {canSubmit ? (
          <SubmitTextForm battleId={battleId} contenderId={contender.id} />
        ) : (
          <SubmissionRenderer
            content={submission?.content_text}
            url={submission?.content_url}
          />
        )}
      </div>

      {/* Vote bar */}
      <div className="flex-shrink-0 h-10 flex items-center px-4 border-t border-surface-border gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-surface-interactive overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${votePercent}%` }}
          />
        </div>
        <span className="text-xs font-bold text-surface-text-muted w-10 text-right">{votePercent}%</span>
      </div>
    </div>
  )
}
