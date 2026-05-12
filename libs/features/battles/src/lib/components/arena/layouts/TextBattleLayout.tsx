import React, { useState } from 'react'
import type { BattleLayoutContext } from '../../../types/battle-layout.types'
import { BattleResultsPanel } from '../../results/BattleResultsPanel'
import { ExecutionStatusBadge } from '../ExecutionStatusBadge'
import { ProviderBadge } from '../../results/ProviderBadge'
import { SubmitTextForm } from '../../submission/SubmitTextForm'

/**
 * Text/code/poem battle layout.
 * - Markdown-rendered content side by side with expandable full view
 * - Token/character count metadata
 * - Expandable full-output mode (removes height cap)
 * - Contender info + execution metadata in header
 * - Results panel below as first-class section
 */
export function TextBattleLayout(ctx: BattleLayoutContext) {
  const {
    battle,
    currentPhase,
    isResult,
    contenders,
    submissions,
    aggregates,
    totalVotes,
    executionJobs,
    scorecardData,
    renderer,
    currentUserId,
    myVote,
    onVote,
  } = ctx

  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set())

  const toggleExpand = (contenderId: string) => {
    setExpandedSlots((prev) => {
      const next = new Set(prev)
      next.has(contenderId) ? next.delete(contenderId) : next.add(contenderId)
      return next
    })
  }

  const { SubmissionRenderer } = renderer

  return (
    <div className="flex flex-col">
      {/* Task prompt — shared reference above both columns */}
      {battle.task_prompt && (
        <div className="border-b border-surface-border-subtle bg-surface-sunken px-6 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-surface-text-disabled mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-yellow-500" />
            Prompt
          </p>
          <p className="text-sm text-surface-text leading-relaxed whitespace-pre-wrap max-w-4xl">{battle.task_prompt}</p>
        </div>
      )}

      {/* Side-by-side columns */}
      <div className="flex flex-col md:flex-row border-b border-surface-border">
        {contenders.map((contender, idx) => {
          const submission = submissions.find((s) => s.contender_id === contender.id)
          const aggregate = aggregates.find((a) => a.contender_id === contender.id)
          const executionJob = executionJobs.find((j) => j.contender_id === contender.id)
          const voteCount = aggregate?.raw_vote_count ?? 0
          const votePercent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0
          const isExpanded = expandedSlots.has(contender.id)

          const isCurrentUserContender =
            !!currentUserId &&
            !!contender.contender_ref_id &&
            currentUserId === contender.contender_ref_id

          const canSubmit =
            isCurrentUserContender && battle.status === 'open' && !submission

          const charCount = submission?.content_text?.length ?? 0
          const wordCount = submission?.content_text
            ? submission.content_text.trim().split(/\s+/).filter(Boolean).length
            : 0

          return (
            <div
              key={contender.id}
              className={`flex flex-col flex-1 min-w-0 ${
                idx < contenders.length - 1 ? 'border-b md:border-b-0 md:border-r' : ''
              } border-surface-border-subtle`}
            >
              {/* Column header */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-surface-border bg-surface-base sticky top-0 z-10">
                <div className="h-7 w-7 rounded-lg bg-primary-yellow-500 flex items-center justify-center text-xs font-black text-dark-900">
                  {contender.slot}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-surface-text truncate tracking-tight">
                      {contender.display_name}
                    </span>
                    {isCurrentUserContender && (
                      <span className="px-1.5 py-0.5 rounded-md bg-primary-yellow-100 text-[10px] font-bold text-primary-yellow-900 border border-primary-yellow-300">YOU</span>
                    )}
                    {executionJob && (
                      <ExecutionStatusBadge status={executionJob.status} retryCount={executionJob.retry_count} />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold text-surface-text tabular-nums">{votePercent}%</span>
                  {submission && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(contender.id)}
                      className="text-[10px] font-semibold text-surface-text-muted border border-surface-border-subtle rounded px-1.5 py-0.5 hover:bg-surface-interactive transition-colors"
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? '↑ Collapse' : '↓ Expand'}
                    </button>
                  )}
                </div>
              </div>

              {/* Submission content */}
              <div
                className={`overflow-y-auto p-5 md:p-6 bg-surface-base ${
                  isExpanded ? '' : 'max-h-[480px] md:max-h-[55vh]'
                }`}
              >
                {canSubmit ? (
                  <SubmitTextForm battleId={battle.id} contenderId={contender.id} />
                ) : !submission && battle.status === 'open' ? (
                  <div className="flex flex-col items-center justify-center py-12 text-surface-text-muted">
                    <span className="w-5 h-5 mb-3 rounded-full border-2 border-primary-yellow-500 border-t-transparent animate-spin" />
                    <p className="text-sm font-semibold">Awaiting submission…</p>
                  </div>
                ) : (
                  <SubmissionRenderer content={submission?.content_text} url={submission?.content_url} />
                )}
              </div>

              {/* Footer: word/char counts + vote bar */}
              <div className="flex-shrink-0 border-t border-surface-border bg-surface-raised px-5 py-2.5 flex items-center gap-4">
                {charCount > 0 && (
                  <span className="text-xs text-surface-text-disabled tabular-nums">
                    {wordCount.toLocaleString()} words · {charCount.toLocaleString()} chars
                  </span>
                )}
                <div className="flex-1 h-1.5 rounded-full bg-surface-interactive overflow-hidden shadow-inner">
                  <div
                    className="h-full rounded-full bg-primary-yellow-500 transition-all duration-700"
                    style={{ width: `${votePercent}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-surface-text-muted tabular-nums w-9 text-right">{voteCount}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* First-class results panel */}
      <BattleResultsPanel
        battle={battle}
        currentPhase={currentPhase}
        isResult={isResult}
        contenders={contenders}
        aggregates={aggregates}
        totalVotes={totalVotes}
        executionJobs={executionJobs}
        scorecardData={scorecardData}
        currentUserId={currentUserId}
        myVote={myVote}
        onVote={onVote}
      />
    </div>
  )
}
