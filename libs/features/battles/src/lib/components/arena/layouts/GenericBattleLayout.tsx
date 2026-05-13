import React from 'react'
import type { BattleLayoutContext } from '../../../types/battle-layout.types'
import type { Contender, Submission, VoteAggregate } from '../../../types/battle.types'
import type { BattleContentRenderer } from '../../../types/battle-renderer.types'
import type { PublicExecutionJobRecord } from '../../../hooks/query/useExecutionJobs'
import { ExecutionStatusBadge } from '../ExecutionStatusBadge'
import { SubmitTextForm } from '../../submission/SubmitTextForm'
import { BattleResultsPanel } from '../../results/BattleResultsPanel'
import { ProviderBadge } from '../../results/ProviderBadge'

interface ContenderPanelProps {
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
  executionJob?: PublicExecutionJobRecord | null
  fundingSource?: string | null
}

function ContenderPanel({
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
  executionJob,
  fundingSource,
}: ContenderPanelProps) {
  const { SubmissionRenderer } = renderer
  const voteCount = aggregate?.raw_vote_count ?? 0
  const votePercent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0

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
    <div className="flex flex-col flex-1 min-w-0 border-b border-surface-border-subtle last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-surface-border bg-surface-base">
        <div className="h-8 w-8 rounded-lg bg-primary-yellow-500 flex items-center justify-center text-sm font-black text-dark-900 shadow-[var(--cl-elevation-inset-1)]">
          {slot}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-bold text-surface-text truncate tracking-tight">
              {contender?.display_name ?? '—'}
            </span>
            {isCurrentUserContender && (
              <span className="px-1.5 py-0.5 rounded-md bg-primary-yellow-100 text-[10px] font-bold text-primary-yellow-900 border border-primary-yellow-300">YOU</span>
            )}
            {fundingSource && <ProviderBadge fundingSource={fundingSource} />}
            {executionJob && (
              <ExecutionStatusBadge status={executionJob.status} retryCount={executionJob.retry_count} />
            )}
          </div>
        </div>
        <div className="flex flex-col items-end flex-shrink-0 pl-2">
          <span className="text-sm font-bold text-surface-text">{voteCount}</span>
          <span className="text-[10px] font-semibold text-surface-text-muted uppercase tracking-wider">Votes</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-5 md:p-6 bg-surface-base">
        {canSubmit ? (
          <div className="space-y-6 max-w-2xl mx-auto">
            {taskPrompt && (
              <div className="rounded-xl border border-surface-border-subtle bg-surface-raised p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-surface-text-disabled mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-yellow-500" />
                  Active Task
                </p>
                <p className="text-[15px] text-surface-text leading-relaxed whitespace-pre-wrap">{taskPrompt}</p>
              </div>
            )}
            <SubmitTextForm battleId={battleId} contenderId={contender.id} />
          </div>
        ) : !submission && battleStatus === 'open' && taskPrompt ? (
          <div className="space-y-5 max-w-2xl mx-auto">
            <div className="rounded-xl border border-surface-border-subtle bg-surface-raised p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-surface-text-disabled mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-yellow-500" />
                Active Task
              </p>
              <p className="text-[15px] text-surface-text leading-relaxed whitespace-pre-wrap">{taskPrompt}</p>
            </div>
            <div className="flex flex-col items-center justify-center py-8 text-surface-text-muted bg-surface-sunken rounded-xl border border-dashed border-surface-border">
              <span className="w-6 h-6 mb-3 rounded-full border-2 border-primary-yellow-500 border-t-transparent animate-spin" />
              <p className="text-sm font-semibold">Waiting for submission…</p>
            </div>
          </div>
        ) : (
          <SubmissionRenderer content={submission?.content_text} url={submission?.content_url} />
        )}
      </div>

      {/* Vote bar */}
      <div className="flex-shrink-0 flex items-center px-5 py-3 border-t border-surface-border bg-surface-raised gap-4">
        <div className="flex-1 h-2 rounded-full bg-surface-interactive overflow-hidden shadow-inner">
          <div
            className="h-full rounded-full bg-primary-yellow-500 transition-all duration-700 ease-[var(--cl-ease-spring)]"
            style={{ width: `${votePercent}%` }}
          />
        </div>
        <span className="text-sm font-bold text-surface-text-muted w-10 text-right tabular-nums tracking-tight">{votePercent}%</span>
      </div>
    </div>
  )
}

/**
 * GRASP: Polymorphism — fallback layout for any battle type not handled by a
 * specialized layout. Renders N contenders side-by-side with results below.
 * Accepts N contenders (not hardcoded to A/B).
 */
export function GenericBattleLayout(ctx: BattleLayoutContext) {
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

  return (
    <div className="flex flex-col min-h-0">
      {/* Contender columns — scrollable together in the outer immersive view */}
      <div className="flex flex-col md:flex-row border-b border-surface-border">
        {contenders.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-20 text-surface-text-muted text-sm">
            No contenders yet.
          </div>
        ) : (
          contenders.map((contender) => {
            const submission = submissions.find((s) => s.contender_id === contender.id)
            const aggregate = aggregates.find((a) => a.contender_id === contender.id)
            const executionJob = executionJobs.find((j) => j.contender_id === contender.id)

            return (
              <ContenderPanel
                key={contender.id}
                slot={contender.slot}
                contender={contender}
                submission={submission}
                aggregate={aggregate}
                renderer={renderer}
                totalVotes={totalVotes}
                battleId={battle.id}
                battleStatus={battle.status}
                taskPrompt={battle.task_prompt}
                currentUserId={currentUserId}
                executionJob={executionJob}
              />
            )
          })
        )}
      </div>

      {/* First-class results section */}
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
