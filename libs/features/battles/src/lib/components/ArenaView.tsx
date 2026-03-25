import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useBattle } from '../hooks/useBattle'
import { useBattleContenders } from '../hooks/useBattleContenders'
import { useVoteAggregates } from '../hooks/useVoteAggregates'
import { useSubmitVote } from '../hooks/useSubmitVote'
import { useBattleScorecard } from '../hooks/useBattleScorecard'
import { useBattleStateMachine } from '../hooks/useBattleStateMachine'
import { PhaseIndicator } from './PhaseIndicator'
import { FightView } from './FightView'
import { ScoreSystem } from './ScoreSystem'
import { XPGainToast } from './XPGainToast'
import { BattleSEOHead } from './BattleSEOHead'
import type { BattleUIPhase } from '../types/battle.types'
import type { SubmitVoteInput } from '@lenserfight/data/repositories'

// These are passed in from the arena app to avoid coupling
interface ArenaViewRenderProps {
  renderContenderSlot: (props: {
    slot: 'A' | 'B'
    displayName: string
    contenderType: 'human' | 'ai_model' | 'ai_agent' | 'ai_runner'
    contentText?: string | null
    contentUrl?: string | null
    voteCount?: number
    votePercentage?: number
  }) => React.ReactNode
  renderVotePanel: (props: {
    battleId: string
    contenderA: { id: string; displayName: string }
    contenderB: { id: string; displayName: string }
    disabled: boolean
    onVote: (value: 'contender_a' | 'contender_b' | 'draw', rationale: string) => Promise<void>
  }) => React.ReactNode
  renderRubricPanel: (props: {
    criteria: Array<{ id: string; name: string; description?: string; weight: number }>
    scorecardA: Array<{ rubricCriterionId: string; result: string; explanation?: string }>
    scorecardB: Array<{ rubricCriterionId: string; result: string; explanation?: string }>
  }) => React.ReactNode
  renderResultBanner: (props: {
    winnerName?: string
    winnerSlot?: 'A' | 'B' | 'draw'
    voteA: number
    voteB: number
  }) => React.ReactNode
  renderShareCard: (props: { battleSlug: string; battleTitle: string }) => React.ReactNode
  renderStatusBadge: (props: { status: string }) => React.ReactNode
}

interface ArenaViewProps extends ArenaViewRenderProps {
  slug: string
  /** Override the phase — used by BattleResultPage to force result view */
  forcePhase?: BattleUIPhase
  currentUserId?: string
}

const phaseVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
}

export function ArenaView({
  slug,
  forcePhase,
  currentUserId,
  renderContenderSlot,
  renderVotePanel,
  renderRubricPanel,
  renderResultBanner,
  renderShareCard,
  renderStatusBadge,
}: ArenaViewProps) {
  const [xpVisible, setXpVisible] = useState(false)

  const { data: battle, isLoading: battleLoading, error: battleError } = useBattle(slug)
  const { data: contendersData } = useBattleContenders(battle?.id)
  const { data: aggregates = [] } = useVoteAggregates(battle?.id)
  const { data: scorecardData } = useBattleScorecard(battle?.id)
  const { mutateAsync: submitVote } = useSubmitVote(battle?.id)

  const stateMachine = useBattleStateMachine(battle?.status)
  const currentPhase = forcePhase ?? stateMachine.currentPhase

  const contenders = contendersData?.contenders ?? []
  const submissions = contendersData?.submissions ?? []

  const contenderA = contenders.find((c) => c.slot === 'A')
  const contenderB = contenders.find((c) => c.slot === 'B')
  const submissionA = contenderA ? submissions.find((s) => s.contender_id === contenderA.id) : undefined
  const submissionB = contenderB ? submissions.find((s) => s.contender_id === contenderB.id) : undefined

  const aggA = contenderA ? aggregates.find((v) => v.contender_id === contenderA.id) : undefined
  const aggB = contenderB ? aggregates.find((v) => v.contender_id === contenderB.id) : undefined

  const criteria = scorecardData?.criteria ?? []
  const scorecards = scorecardData?.scorecards ?? []

  const scorecardA = contenderA
    ? scorecards
        .filter((s) => s.contender_id === contenderA.id)
        .map((s) => ({ rubricCriterionId: s.rubric_criterion_id, result: s.result, explanation: s.explanation }))
    : []

  const scorecardB = contenderB
    ? scorecards
        .filter((s) => s.contender_id === contenderB.id)
        .map((s) => ({ rubricCriterionId: s.rubric_criterion_id, result: s.result, explanation: s.explanation }))
    : []

  // Derive winner from aggregates for result phase
  let winnerSlot: 'A' | 'B' | 'draw' | undefined
  let winnerName: string | undefined
  if (aggA && aggB) {
    const countA = aggA.raw_vote_count ?? 0
    const countB = aggB.raw_vote_count ?? 0
    if (aggA.rank_position === 1 && aggB.rank_position !== 1) {
      winnerSlot = 'A'
      winnerName = contenderA?.display_name
    } else if (aggB.rank_position === 1 && aggA.rank_position !== 1) {
      winnerSlot = 'B'
      winnerName = contenderB?.display_name
    } else if (countA === countB && countA > 0) {
      winnerSlot = 'draw'
    }
  }

  const handleVote = async (value: 'contender_a' | 'contender_b' | 'draw', rationale: string) => {
    if (!battle || !currentUserId) return

    const votedContenderId =
      value === 'contender_a'
        ? (contenderA?.id ?? null)
        : value === 'contender_b'
        ? (contenderB?.id ?? null)
        : null

    const input: SubmitVoteInput = {
      battle_id: battle.id,
      voter_lenser_id: currentUserId,
      vote_value: value,
      voted_contender_id: votedContenderId,
      rationale,
      is_draw: value === 'draw',
    }

    await submitVote(input)

    // Show XP toast briefly
    setXpVisible(true)
    setTimeout(() => setXpVisible(false), 2500)
  }

  if (battleLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <div className="h-8 bg-gray-100 rounded animate-pulse w-1/2" />
        <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (battleError || !battle) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-gray-400">
        <p className="text-4xl mb-3">⚔️</p>
        <p className="font-medium">{battleError?.message ?? 'Battle not found.'}</p>
        <Link to="/battles" className="text-sm text-blue-600 underline mt-3 inline-block">
          Back to battles
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <BattleSEOHead battle={battle} />
      <XPGainToast visible={xpVisible} xp={10} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link to="/battles" className="text-xs text-gray-400 hover:text-gray-600 mb-2 inline-block">
            ← All Battles
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{battle.title}</h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          {renderStatusBadge({ status: battle.status })}
          <PhaseIndicator currentPhase={currentPhase} />
        </div>
      </div>

      {/* Task prompt */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Task</p>
        <p className="text-sm text-gray-800 leading-relaxed">{battle.task_prompt}</p>
      </div>

      {/* Phase-driven content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPhase}
          variants={phaseVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
          className="space-y-6"
        >
          {/* Idle: awaiting submissions */}
          {currentPhase === 'idle' && (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center text-gray-400">
              <p className="text-3xl mb-2">⏳</p>
              <p className="font-medium">Awaiting contender submissions</p>
              <p className="text-sm mt-1 text-gray-300">This battle is open — submissions coming soon.</p>
            </div>
          )}

          {/* Running: show submissions but no votes yet */}
          {currentPhase === 'running' && (
            <FightView
              contenderA={contenderA}
              contenderB={contenderB}
              submissionA={submissionA}
              submissionB={submissionB}
              phase={currentPhase}
              renderContenderSlot={renderContenderSlot}
            />
          )}

          {/* Voting: live vote tally + vote panel */}
          {currentPhase === 'voting' && (
            <>
              <FightView
                contenderA={contenderA}
                contenderB={contenderB}
                submissionA={submissionA}
                submissionB={submissionB}
                aggregates={aggregates}
                phase={currentPhase}
                renderContenderSlot={renderContenderSlot}
              />
              <ScoreSystem aggregates={aggregates} contenders={contenders} />
              {contenderA && contenderB &&
                renderVotePanel({
                  battleId: battle.id,
                  contenderA: { id: contenderA.id, displayName: contenderA.display_name },
                  contenderB: { id: contenderB.id, displayName: contenderB.display_name },
                  disabled: !currentUserId,
                  onVote: handleVote,
                })}
            </>
          )}

          {/* Result: winner reveal + full breakdown */}
          {currentPhase === 'result' && (
            <>
              {renderResultBanner({
                winnerName,
                winnerSlot,
                voteA: aggA?.raw_vote_count ?? 0,
                voteB: aggB?.raw_vote_count ?? 0,
              })}
              <FightView
                contenderA={contenderA}
                contenderB={contenderB}
                submissionA={submissionA}
                submissionB={submissionB}
                aggregates={aggregates}
                phase={currentPhase}
                renderContenderSlot={renderContenderSlot}
              />
              {criteria.length > 0 &&
                renderRubricPanel({ criteria, scorecardA, scorecardB })}
              {renderShareCard({ battleSlug: battle.slug, battleTitle: battle.title })}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Detail page: link to result when published */}
      {(battle.status === 'published' || battle.status === 'closed') && currentPhase !== 'result' && (
        <div className="text-center pt-2">
          <Link
            to={`/battles/${battle.slug}/result`}
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-900 border border-gray-900 rounded-lg px-4 py-2 hover:bg-gray-900 hover:text-white transition-colors"
          >
            See Full Result →
          </Link>
        </div>
      )}
    </div>
  )
}
