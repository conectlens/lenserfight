import { Badge, Card } from '@lenserfight/ui/components'
import { AnimatePresence, motion } from 'framer-motion'
import React, { useState } from 'react'
import { Link } from 'react-router-dom'

import { useBattle } from '../../hooks/query/useBattle'
import { useBattleContenders } from '../../hooks/query/useBattleContenders'
import { useBattleExecution } from '../../hooks/execution/useBattleExecution'
import { useBattleScorecard } from '../../hooks/query/useBattleScorecard'
import { useBattleStateMachine } from '../../hooks/utils/useBattleStateMachine'
import { useLensAssignment } from '../../hooks/query/useLensAssignment'
import { usePublishBattle } from '../../hooks/mutations/usePublishBattle'
import { useSubmitVote } from '../../hooks/mutations/useSubmitVote'
import { useVoteAggregates } from '../../hooks/query/useVoteAggregates'
import { useVoterEligibility } from '../../hooks/query/useVoterEligibility'
import { useAiJudgeVerdicts } from '../../hooks/query/useAiJudgeVerdicts'

import { BattleChatPanel } from '../chat/BattleChatPanel'
import { BattleCreatorPanel } from '../display/BattleCreatorPanel'
import { BattleLiveArena } from './BattleLiveArena'
import { BattleSEOHead } from '../display/BattleSEOHead'
import { FightView } from './FightView'
import { PhaseIndicator } from '../display/PhaseIndicator'
import { ScoreSystem } from '../scoring/ScoreSystem'
import { XPGainToast } from '../display/XPGainToast'

import type { BattleUIPhase, ContenderLensAssignmentRecord } from '../../types/battle.types'
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
    mediaUrl?: string | null
    mimeType?: string | null
    outputModality?: 'text' | 'image' | 'video' | 'audio' | null
  }) => React.ReactNode
  renderVotePanel: (props: {
    battleId: string
    contenderA: { id: string; displayName: string }
    contenderB: { id: string; displayName: string }
    disabled: boolean
    onVote: (value: 'contender_a' | 'contender_b' | 'draw', rationale: string) => Promise<void>
    voterEligibility?: import('../../types/battle.types').VoterEligibility
    isEligible: boolean
  }) => React.ReactNode
  renderRubricPanel: (props: {
    criteria: Array<{ id: string; title: string; description?: string; weight: number }>
    scorecardA: Array<{ rubricCriterionId: string; result: 'pass' | 'fail' | 'partial' | 'skipped'; explanation?: string }>
    scorecardB: Array<{ rubricCriterionId: string; result: 'pass' | 'fail' | 'partial' | 'skipped'; explanation?: string }>
    verdictsA: import('../../hooks/query/useAiJudgeVerdicts').AiJudgeVerdictRecord[]
    verdictsB: import('../../hooks/query/useAiJudgeVerdicts').AiJudgeVerdictRecord[]
  }) => React.ReactNode
  renderResultBanner: (props: {
    winnerName?: string
    winnerSlot?: 'A' | 'B' | 'draw'
    voteA: number
    voteB: number
  }) => React.ReactNode
  renderShareCard: (props: { battleSlug: string; battleTitle: string; winnerName?: string | null; ogImageUrl?: string | null }) => React.ReactNode
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
  const { mutate: publishBattle, isPending: isPublishing } = usePublishBattle(slug)
  const { data: contendersData } = useBattleContenders(battle?.id)
  const { data: aggregates = [] } = useVoteAggregates(battle?.id)
  const { data: scorecardData } = useBattleScorecard(battle?.id)
  const { mutateAsync: submitVote } = useSubmitVote(battle?.id)
  const { isEligible } = useVoterEligibility(battle?.id, currentUserId)

  const stateMachine = useBattleStateMachine(battle?.status)
  const currentPhase = forcePhase ?? stateMachine.currentPhase

  const contenders = contendersData?.contenders ?? []
  const submissions = contendersData?.submissions ?? []

  const contenderA = contenders.find((c) => c.slot === 'A')
  const contenderB = contenders.find((c) => c.slot === 'B')

  // Fetch lens assignments for live arena
  const { data: lensAssignmentA } = useLensAssignment(contenderA?.id)
  const { data: lensAssignmentB } = useLensAssignment(contenderB?.id)
  const lensAssignments = [
    lensAssignmentA,
    lensAssignmentB,
  ].filter(Boolean) as ContenderLensAssignmentRecord[]

  const { startExecution, isExecuting } = useBattleExecution({
    battle,
    contenderA,
    contenderB,
    lensAssignments,
    currentUserId,
  })
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

  const { data: aiVerdicts = [] } = useAiJudgeVerdicts(battle?.id)
  const verdictsA = contenderA ? aiVerdicts.filter((v) => v.contender_id === contenderA.id) : []
  const verdictsB = contenderB ? aiVerdicts.filter((v) => v.contender_id === contenderB.id) : []

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
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
        <div className="h-8 w-1/2 animate-pulse rounded-full bg-surface-raised" />
        <div className="h-4 w-3/4 animate-pulse rounded-full bg-surface-raised" />
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="h-64 animate-pulse rounded-3xl bg-surface-raised" />
          <div className="h-64 animate-pulse rounded-3xl bg-surface-raised" />
        </div>
      </div>
    )
  }

  if (battleError || !battle) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <Card className="mx-auto max-w-xl space-y-4 p-8 text-center">
          <p className="text-4xl">⚔️</p>
          <p className="text-lg font-semibold text-greyscale-900 dark:text-greyscale-50">
            {battleError?.message ?? 'Battle not found.'}
          </p>
          <Link
            to="/battles"
            className="inline-flex items-center gap-2 rounded-full bg-greyscale-900 px-5 py-3 text-sm font-bold text-greyscale-0 transition-colors hover:opacity-90 dark:bg-greyscale-0 dark:text-greyscale-900"
          >
            Back to battles
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <BattleSEOHead battle={battle} />
      <XPGainToast visible={xpVisible} xp={10} />

      <Card className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Link to="/battles" className="text-xs font-medium text-greyscale-500 transition-colors hover:text-greyscale-900 dark:hover:text-greyscale-50">
              ← All battles
            </Link>
            <div className="space-y-2">
              <Badge color="blue" variant="outline">
                Battle detail
              </Badge>
              <h1 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-50 sm:text-4xl">
                {battle.title}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {renderStatusBadge({ status: battle.status })}
            <PhaseIndicator currentPhase={currentPhase} />
          </div>
        </div>

        <Card className="space-y-2 border border-surface-border bg-surface-raised p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-greyscale-500">Lens prompt</p>
          <p className="text-sm leading-7 text-greyscale-700 dark:text-greyscale-300">{battle.task_prompt}</p>
        </Card>
      </Card>

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
            <>
              <Card className="space-y-3 border border-dashed border-surface-border p-8 text-center">
                <p className="text-3xl mb-2">⏳</p>
                <p className="font-semibold text-greyscale-900 dark:text-greyscale-50">Awaiting contender submissions</p>
                <p className="text-sm text-greyscale-500 dark:text-greyscale-400">This battle is open and the first execution is still in progress.</p>
              </Card>
              {currentUserId && battle?.creator_lenser_id && currentUserId === battle.creator_lenser_id && (
                <BattleCreatorPanel
                  battleId={battle.id}
                  status={battle.status}
                  battleType={battle.battle_type}
                  onPublish={publishBattle}
                  isPublishing={isPublishing}
                  onStartExecution={startExecution}
                  isStartingExecution={isExecuting}
                />
              )}
            </>
          )}

          {/* Running: live execution or static submissions */}
          {currentPhase === 'running' && (
            <>
              {battle.status === 'executing' ? (
                <BattleLiveArena
                  battle={battle}
                  contenderA={contenderA}
                  contenderB={contenderB}
                  lensAssignments={lensAssignments}
                  currentUserId={currentUserId}
                />
              ) : (
                <FightView
                  contenderA={contenderA}
                  contenderB={contenderB}
                  submissionA={submissionA}
                  submissionB={submissionB}
                  phase={currentPhase}
                  renderContenderSlot={renderContenderSlot}
                />
              )}
            </>
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
                  voterEligibility: battle.voter_eligibility,
                  isEligible,
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
                renderRubricPanel({ criteria, scorecardA, scorecardB, verdictsA, verdictsB })}
              {renderShareCard({ battleSlug: battle.slug, battleTitle: battle.title, winnerName, ogImageUrl: battle.og_image_url ?? null })}
              {battle.forum_thread_id && (
                <div className="mt-4 text-center">
                  <a
                    href={`/threads/${battle.forum_thread_id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    Discuss in forum →
                  </a>
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Live discussion — visible once battle is open */}
      {battle.status !== 'draft' && (
        <BattleChatPanel battleId={battle.id} currentUserId={currentUserId} />
      )}

      {/* Detail page: link to result when published */}
      {(battle.status === 'published' || battle.status === 'closed') && currentPhase !== 'result' && (
        <div className="flex justify-center pt-2">
          <Link
            to={`/battles/${battle.slug}/result`}
            className="inline-flex items-center gap-2 rounded-full bg-greyscale-900 px-5 py-3 text-sm font-bold text-greyscale-0 transition-colors hover:opacity-90 dark:bg-greyscale-0 dark:text-greyscale-900"
          >
            See full result
          </Link>
        </div>
      )}
    </div>
  )
}
