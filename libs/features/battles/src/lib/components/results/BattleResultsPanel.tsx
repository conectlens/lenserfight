import { motion, AnimatePresence } from 'framer-motion'
import React from 'react'

import { ScoreBar } from '@lenserfight/ui/widgets'
import { Badge } from '@lenserfight/ui/components'

import type { BattleLayoutContext } from '../../types/battle-layout.types'
import type { VoteValue } from '../../types/battle.types'
import { VotePanel } from '../scoring/VotePanel'
import { BattleResultCTA } from '../result/BattleResultCTA'
import { ExecutionMetadataPanel } from './ExecutionMetadataPanel'
import { ScorecardPanel } from './ScorecardPanel'

type BattleResultsPanelProps = Pick<
  BattleLayoutContext,
  | 'battle'
  | 'currentPhase'
  | 'isResult'
  | 'contenders'
  | 'aggregates'
  | 'totalVotes'
  | 'executionJobs'
  | 'scorecardData'
  | 'currentUserId'
  | 'myVote'
  | 'onVote'
>

const panelVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0, 0, 0.2, 1] } },
  exit: { opacity: 0, y: 20, transition: { duration: 0.18 } },
}

function WinnerAnnouncement({
  winnerName,
  winnerSlot,
  voteA,
  voteB,
  drawCount,
  totalVotes,
  forumThreadId,
}: {
  winnerName?: string
  winnerSlot?: 'A' | 'B' | 'draw'
  voteA: number
  voteB: number
  drawCount: number
  totalVotes: number
  forumThreadId?: string | null
}) {
  const PARTICLE_COLORS = [
    'var(--cl-status-blue)',
    'var(--cl-status-purple)',
    'var(--cl-status-green)',
    'var(--cl-yellow-500)',
    'var(--cl-navy-400)',
  ]

  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-raised p-6 shadow-neu-1">
      {/* Confetti particles for winner */}
      {(winnerSlot === 'A' || winnerSlot === 'B') &&
        PARTICLE_COLORS.map((color, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full w-2.5 h-2.5 pointer-events-none"
            style={{ backgroundColor: color, left: `${12 + i * 18}%`, top: '40%' }}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -100 }}
            transition={{ duration: 1.4, delay: i * 0.1, ease: [0.4, 0, 1, 1] }}
          />
        ))}

      <div className="text-center space-y-2 mb-5">
        {winnerSlot === 'draw' ? (
          <Badge color="gray" variant="outline">It&apos;s a draw</Badge>
        ) : winnerName ? (
          <Badge color="green" variant="outline">Winner</Badge>
        ) : (
          <Badge color="gray" variant="outline">Result pending</Badge>
        )}

        <p className="text-2xl font-black tracking-tight text-surface-text mt-2">
          {winnerSlot === 'draw'
            ? 'The community split evenly.'
            : winnerName
              ? `${winnerName} wins the battle.`
              : 'Result pending'}
        </p>
      </div>

      {/* Score bars */}
      <ScoreBar scoreA={voteA} scoreB={voteB} labelA="A" labelB="B" />

      <div className="mt-3 flex items-center justify-between text-xs text-surface-text-muted">
        <span className="font-semibold tabular-nums">{voteA} votes</span>
        {drawCount > 0 && <span className="text-surface-text-muted/70">{drawCount} draws</span>}
        <span className="font-semibold tabular-nums">{voteB} votes</span>
      </div>

      {/* Total vote count */}
      <div className="mt-3 text-center text-xs text-surface-text-disabled">
        {totalVotes} total vote{totalVotes !== 1 ? 's' : ''} cast
      </div>

      {forumThreadId && (
        <div className="mt-4 text-center">
          <a
            href={`/threads/${forumThreadId}`}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Discuss in forum →
          </a>
        </div>
      )}
    </div>
  )
}

function IdleState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-surface-text-muted">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block h-2.5 w-2.5 rounded-full bg-surface-interactive animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <p className="text-sm font-semibold">Waiting for submissions…</p>
      <p className="text-xs text-surface-text-disabled">Results will appear here once the battle completes.</p>
    </div>
  )
}

function RunningState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <div className="text-surface-text-muted text-xs font-semibold uppercase tracking-widest mb-1">AI Scoring</div>
      <div className="flex justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block h-3 w-3 rounded-full bg-primary-yellow-500 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <p className="text-xs text-surface-text-disabled">Evaluating submissions…</p>
    </div>
  )
}

/**
 * GRASP: Information Expert — owns all result/voting display logic.
 * First-class results section that replaces the tiny ArenaCenterZone card.
 * Shows: phase-appropriate UI, winner, vote breakdown, execution metadata, scorecards.
 */
export function BattleResultsPanel({
  battle,
  currentPhase,
  isResult,
  contenders,
  aggregates,
  totalVotes,
  executionJobs,
  scorecardData,
  currentUserId,
  myVote,
  onVote,
}: BattleResultsPanelProps) {
  const contenderA = contenders.find((c) => c.slot === 'A')
  const contenderB = contenders.find((c) => c.slot === 'B')

  const aggA = aggregates.find((a) => a.contender_id === contenderA?.id)
  const aggB = aggregates.find((a) => a.contender_id === contenderB?.id)
  const drawCount = (aggA?.draw_count ?? 0) + (aggB?.draw_count ?? 0)

  const winnerSlot: 'A' | 'B' | 'draw' | undefined = isResult
    ? (() => {
        const aVotes = aggA?.raw_vote_count ?? 0
        const bVotes = aggB?.raw_vote_count ?? 0
        if (aVotes === bVotes) return 'draw'
        return aVotes > bVotes ? 'A' : 'B'
      })()
    : undefined

  const winnerName =
    winnerSlot === 'A' ? contenderA?.display_name :
    winnerSlot === 'B' ? contenderB?.display_name :
    undefined

  const hasExecutionMetadata = executionJobs.length > 0 && (
    executionJobs.some((j) => j.claimed_at || j.error_message)
  )
  const hasScorecardData = scorecardData && scorecardData.scorecards.length > 0

  return (
    <section
      aria-label="Battle Results"
      className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6"
    >
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-surface-text-disabled">Results</h2>
        <div className="flex-1 h-px bg-surface-border-subtle" />
        {isResult && (
          <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border border-emerald-300 dark:border-emerald-700">
            Final
          </span>
        )}
        {currentPhase === 'voting' && (
          <span className="rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border border-blue-300 dark:border-blue-700">
            Voting open
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {currentPhase === 'idle' && (
          <motion.div key="idle" variants={panelVariants} initial="initial" animate="animate" exit="exit">
            <div className="rounded-xl border border-surface-border-subtle bg-surface-raised">
              <IdleState />
            </div>
          </motion.div>
        )}

        {currentPhase === 'running' && (
          <motion.div key="running" variants={panelVariants} initial="initial" animate="animate" exit="exit">
            <div className="rounded-xl border border-surface-border-subtle bg-surface-raised">
              <RunningState />
            </div>
          </motion.div>
        )}

        {currentPhase === 'voting' && contenderA && contenderB && (
          <motion.div key="voting" variants={panelVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
            <VotePanel
              battleId={battle.id}
              contenderA={{ id: contenderA.id, displayName: contenderA.display_name }}
              contenderB={{ id: contenderB.id, displayName: contenderB.display_name }}
              disabled={!currentUserId}
              voterEligibility={battle.voter_eligibility}
              existingVote={(myVote as VoteValue | null) ?? null}
              onVote={onVote}
            />
            {/* Show live vote counts during voting */}
            {totalVotes > 0 && (
              <div className="rounded-xl border border-surface-border-subtle bg-surface-raised p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-surface-text-disabled mb-3">
                  Current standings ({totalVotes} vote{totalVotes !== 1 ? 's' : ''})
                </p>
                <ScoreBar
                  scoreA={aggA?.raw_vote_count ?? 0}
                  scoreB={aggB?.raw_vote_count ?? 0}
                  labelA={contenderA.display_name.slice(0, 12)}
                  labelB={contenderB.display_name.slice(0, 12)}
                />
              </div>
            )}
          </motion.div>
        )}

        {currentPhase === 'result' && (
          <motion.div key="result" variants={panelVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
            <WinnerAnnouncement
              winnerName={winnerName}
              winnerSlot={winnerSlot}
              voteA={aggA?.raw_vote_count ?? 0}
              voteB={aggB?.raw_vote_count ?? 0}
              drawCount={drawCount}
              totalVotes={totalVotes}
              forumThreadId={battle.forum_thread_id}
            />

            {hasScorecardData && (
              <ScorecardPanel
                scorecardData={scorecardData!}
                contenders={contenders}
              />
            )}

            {hasExecutionMetadata && (
              <ExecutionMetadataPanel
                executionJobs={executionJobs}
                contenders={contenders}
              />
            )}

            <BattleResultCTA battleId={battle.id} enabled={battle.status === 'closed'} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
