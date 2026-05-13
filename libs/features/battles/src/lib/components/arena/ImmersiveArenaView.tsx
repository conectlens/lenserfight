import React, { lazy, Suspense, useState } from 'react'
import { useAuth } from '@lenserfight/features/auth'
import { useLenserOptional } from '@lenserfight/features/profile'

import { useBattle } from '../../hooks/query/useBattle'
import { useBattleContenders } from '../../hooks/query/useBattleContenders'
import { useBattleStateMachine } from '../../hooks/utils/useBattleStateMachine'
import { useBattleStateSync } from '../../hooks/realtime/useBattleStateSync'
import { useLensAssignment } from '../../hooks/query/useLensAssignment'
import { useMyVote } from '../../hooks/query/useMyVote'
import { useSubmitVote } from '../../hooks/mutations/useSubmitVote'
import { useVoteAggregates } from '../../hooks/query/useVoteAggregates'
import { useExecutionJobs } from '../../hooks/query/useExecutionJobs'
import { useBattleScorecard } from '../../hooks/query/useBattleScorecard'
import { getRenderer } from '../../renderers'
import { BattleLiveArena } from './BattleLiveArena'
import { ArenaTopBar } from './ArenaTopBar'
import { BattleRulesDrawer } from '../creation/BattleRulesDrawer'
import { BattleSEOHead } from '../display/BattleSEOHead'
import { resolveBattleLayout } from './layouts/BattleLayoutResolver'

import type { ContenderLensAssignmentRecord, VoteValue } from '../../types/battle.types'
import type { BattleContentType } from '../../types/battle-renderer.types'
import type { BattleLayoutContext } from '../../types/battle-layout.types'

import { Drawer } from '@lenserfight/ui/overlays'

const LenserChatRail = lazy(() =>
  import('../chat/LenserChatRail').then((m) => ({ default: m.LenserChatRail }))
)

interface ImmersiveArenaViewProps {
  slug: string
}

/**
 * GRASP: Controller — thin orchestrator that:
 *   1. Fetches all battle data via hooks (Information Expert responsibility stays here)
 *   2. Builds a BattleLayoutContext (Pure Fabrication DTO)
 *   3. Delegates display to the resolved BattleLayoutStrategy (Polymorphism)
 *
 * This component does NOT decide how to render a text vs image vs audio battle.
 * That decision is owned by BattleLayoutResolver (Protected Variations).
 */
export const ImmersiveArenaView: React.FC<ImmersiveArenaViewProps> = ({ slug }) => {
  const { isAuthenticated } = useAuth()
  const lenserCtx = useLenserOptional()
  const lenser = lenserCtx?.lenser ?? null
  const hasLenser = lenserCtx?.hasLenser ?? false
  const currentUserId = lenser?.id
  const [chatOpen, setChatOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)

  // --- Data fetching ---
  const { data: battle, isLoading: battleLoading, error: battleError } = useBattle(slug)
  const { data: contendersData } = useBattleContenders(battle?.id)
  const { data: aggregates = [] } = useVoteAggregates(battle?.id)
  const { currentPhase, isResult } = useBattleStateMachine(battle?.status)
  const submitVote = useSubmitVote(battle?.id)
  const { myVote } = useMyVote(battle?.id, currentUserId)
  const { data: executionJobs = [] } = useExecutionJobs(battle?.id, battle?.status as import('../../types/battle.types').BattleStatus | undefined)
  const { data: scorecardData } = useBattleScorecard(battle?.id)

  // Real-time battle state sync
  useBattleStateSync(battle?.id, slug)

  const contenders = contendersData?.contenders ?? []
  const submissions = contendersData?.submissions ?? []

  const contenderA = contenders.find((c) => c.slot === 'A')
  const contenderB = contenders.find((c) => c.slot === 'B')

  // Lens assignments (keyed by contender_id)
  const { data: lensAssignmentA } = useLensAssignment(contenderA?.id)
  const { data: lensAssignmentB } = useLensAssignment(contenderB?.id)
  const lensAssignments: Record<string, ContenderLensAssignmentRecord | null> = {
    ...(contenderA?.id ? { [contenderA.id]: lensAssignmentA ?? null } : {}),
    ...(contenderB?.id ? { [contenderB.id]: lensAssignmentB ?? null } : {}),
  }

  const totalVotes = aggregates.reduce((sum, a) => sum + (a.raw_vote_count ?? 0), 0)
  const isOwner = !!(battle?.creator_lenser_id && lenser?.id && battle.creator_lenser_id === lenser.id)

  const renderer = getRenderer((battle?.content_type ?? 'text') as BattleContentType)

  const handleVote = async (value: VoteValue, rationale: string) => {
    if (!currentUserId || !contenderA || !contenderB) return
    const votedContenderId =
      value === 'contender_a' ? contenderA.id :
      value === 'contender_b' ? contenderB.id :
      null
    await submitVote.mutateAsync({
      battle_id: battle!.id,
      voter_lenser_id: currentUserId,
      vote_value: value,
      voted_contender_id: votedContenderId,
      rationale,
      is_draw: value === 'draw',
    })
  }

  // --- Loading / error states ---
  if (battleLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Skeleton top bar */}
        <div className="h-14 bg-surface-base border-b border-surface-border animate-pulse" />
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-x divide-surface-border">
          {[0, 1].map((i) => (
            <div key={i} className="p-6 space-y-4">
              <div className="h-6 bg-surface-interactive rounded w-2/3 animate-pulse" />
              <div className="h-4 bg-surface-interactive rounded w-full animate-pulse" style={{ animationDelay: '0.1s' }} />
              <div className="h-4 bg-surface-interactive rounded w-5/6 animate-pulse" style={{ animationDelay: '0.15s' }} />
              <div className="h-4 bg-surface-interactive rounded w-3/4 animate-pulse" style={{ animationDelay: '0.2s' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (battleError || !battle) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-base">
        <div className="text-center space-y-3">
          <p className="text-3xl">⚔️</p>
          <p className="text-sm font-semibold text-greyscale-300">
            {battleError?.message ?? 'Battle not found.'}
          </p>
          <a href="/battles" className="text-xs text-primary hover:underline">← Back to battles</a>
        </div>
      </div>
    )
  }

  // Full-screen live arena during execution
  if (battle.status === 'executing' && currentPhase === 'running') {
    return (
      <BattleLiveArena
        battle={battle}
        contenderA={contenderA}
        contenderB={contenderB}
        lensAssignments={[lensAssignmentA, lensAssignmentB].filter(Boolean) as ContenderLensAssignmentRecord[]}
        currentUserId={currentUserId}
      />
    )
  }

  // --- Build layout context (GRASP: Pure Fabrication DTO) ---
  const ctx: BattleLayoutContext = {
    battle,
    currentPhase,
    isResult,
    contenders,
    submissions,
    aggregates,
    totalVotes,
    executionJobs,
    scorecardData: scorecardData ?? null,
    currentUserId,
    isOwner,
    myVote: (myVote?.vote_value as VoteValue) ?? null,
    lensAssignments,
    onVote: handleVote,
    renderer,
  }

  // --- Resolve layout strategy (GRASP: Polymorphism + Protected Variations) ---
  const { Layout } = resolveBattleLayout(battle)

  return (
    <div className="h-screen bg-surface-base text-surface-text flex flex-col overflow-hidden">
      <BattleSEOHead battle={battle} />

      {/* Shell: top bar + content + optional chat rail */}
      <div className="flex flex-col flex-1 min-h-0">
        <ArenaTopBar
          battle={battle}
          currentPhase={currentPhase}
          onRulesOpen={() => setRulesOpen(true)}
        />

        {/* Main content area + optional desktop chat rail */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Scrollable layout area */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            <Layout {...ctx} />
          </div>

          {/* Desktop chat rail */}
          <div className="hidden md:flex flex-shrink-0">
            <Suspense fallback={
              <div className="w-72 border-l border-surface-border bg-surface-sunken animate-pulse" />
            }>
              <LenserChatRail
                battleId={battle.id}
                currentUserId={currentUserId}
                currentHandle={lenser?.handle}
                senderRole={hasLenser ? 'lenser' : 'viewer'}
                isAuthenticated={isAuthenticated}
              />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Mobile: FAB to open chat drawer */}
      <button
        type="button"
        onClick={() => setChatOpen(true)}
        className="fixed bottom-5 right-4 z-sticky md:hidden flex items-center gap-1.5 bg-primary-yellow-500 text-greyscale-900 rounded-full px-4 py-2.5 shadow-lg text-xs font-bold"
        aria-label="Open Lenser Chat"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        Chat
      </button>

      {/* Mobile chat drawer */}
      <Drawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        side="right"
        width="w-80"
        title="Lenser Chat"
      >
        <Suspense fallback={<div className="flex-1 animate-pulse bg-surface-sunken" />}>
          <LenserChatRail
            battleId={battle.id}
            currentUserId={currentUserId}
            currentHandle={lenser?.handle}
            senderRole={hasLenser ? 'lenser' : 'viewer'}
            isAuthenticated={isAuthenticated}
            className="h-full"
          />
        </Suspense>
      </Drawer>

      {/* Rules drawer */}
      <BattleRulesDrawer
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        battle={battle}
        isOwner={isOwner}
      />
    </div>
  )
}
