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
  taskPrompt?: string
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
  taskPrompt,
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
    <div className={`flex flex-col w-full md:w-0 flex-1 min-w-0 min-h-[280px] md:min-h-0 border-b border-surface-border-subtle last:border-b-0 md:border-b-0 relative ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 min-h-[56px] py-2 flex items-center gap-3 px-5 border-b border-surface-border shadow-sm bg-surface-base z-10 transition-colors">
        <div className="h-8 w-8 rounded-lg bg-primary-yellow-500 flex items-center justify-center text-sm font-black text-dark-900 shadow-[var(--cl-elevation-inset-1)]">
          {slot}
        </div>
        <div className="flex flex-col justify-center min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-surface-text truncate tracking-tight">
              {contender?.display_name ?? '—'}
            </span>
            {isCurrentUserContender && (
              <span className="px-1.5 py-0.5 rounded-md bg-primary-yellow-100 text-[10px] font-bold text-primary-yellow-900 border border-primary-yellow-300">YOU</span>
            )}
            {lensAssignment && (
              <span className="rounded bg-surface-interactive px-1.5 py-0.5 text-[10px] font-semibold text-surface-text-muted border border-surface-border-subtle uppercase tracking-wider">
                lens
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end flex-shrink-0 pl-2">
          <span className="text-sm font-bold text-surface-text">{voteCount}</span>
          <span className="text-[10px] font-semibold text-surface-text-muted uppercase tracking-wider">Votes</span>
        </div>
      </div>

      {/* Submission content, submit form, or empty state with task prompt */}
      <div className="flex-1 overflow-y-auto p-5 md:p-6 bg-surface-base">
        {canSubmit ? (
          <div className="space-y-6 max-w-2xl mx-auto">
            {taskPrompt && (
              <div className="rounded-xl border border-surface-border-subtle bg-surface-raised p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-surface-text-disabled mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-yellow-500"></span>
                  Active Task
                </p>
                <p className="text-[15px] text-surface-text leading-relaxed whitespace-pre-wrap">
                  {taskPrompt}
                </p>
              </div>
            )}
            <SubmitTextForm battleId={battleId} contenderId={contender.id} />
          </div>
        ) : !submission && battleStatus === 'open' && taskPrompt ? (
          <div className="space-y-5 max-w-2xl mx-auto">
            <div className="rounded-xl border border-surface-border-subtle bg-surface-raised p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-surface-text-disabled mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-yellow-500"></span>
                Active Task
              </p>
              <p className="text-[15px] text-surface-text leading-relaxed whitespace-pre-wrap">
                {taskPrompt}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center py-8 text-surface-text-muted bg-surface-sunken rounded-xl border border-dashed border-surface-border">
              <span className="w-6 h-6 mb-3 rounded-full border-2 border-primary-yellow-500 border-t-transparent animate-spin"></span>
              <p className="text-sm font-semibold">Waiting for submission…</p>
            </div>
          </div>
        ) : (
          <SubmissionRenderer
            content={submission?.content_text}
            url={submission?.content_url}
          />
        )}
      </div>

      {/* Vote bar */}
      <div className="flex-shrink-0 h-[52px] flex items-center px-5 border-t border-surface-border bg-surface-raised gap-4">
        <div className="flex-1 h-2.5 rounded-full bg-surface-interactive overflow-hidden shadow-inner">
          <div
            className="h-full rounded-full bg-primary-yellow-500 transition-all duration-700 ease-[var(--cl-ease-spring)]"
            style={{ width: `${votePercent}%` }}
          />
        </div>
        <span className="text-sm font-bold text-surface-text-muted w-11 text-right tabular-nums tracking-tight">{votePercent}%</span>
      </div>
    </div>
  )
}
