import React, { lazy, Suspense, useState } from 'react'
import { useAuth } from '@lenserfight/features/auth'
import { useLenser } from '@lenserfight/features/profile'

import { useBattle } from '../hooks/useBattle'
import { useBattleContenders } from '../hooks/useBattleContenders'
import { useBattleStateMachine } from '../hooks/useBattleStateMachine'
import { useBattleStateSync } from '../hooks/useBattleStateSync'
import { useLensAssignment } from '../hooks/useLensAssignment'
import { useSubmitVote } from '../hooks/useSubmitVote'
import { useVoteAggregates } from '../hooks/useVoteAggregates'
import { getRenderer } from '../renderers'

import { Drawer } from '@lenserfight/ui/overlays'
import { ArenaTopBar } from './ArenaTopBar'
import { ArenaContenderColumn } from './ArenaContenderColumn'
import { ArenaCenterZone } from './ArenaCenterZone'
const LenserChatRail = lazy(() =>
  import('./LenserChatRail').then((m) => ({ default: m.LenserChatRail }))
)
import { BattleSEOHead } from './BattleSEOHead'
import { VotePanel } from './VotePanel'
import { ResultBanner } from './ResultBanner'

interface ImmersiveArenaViewProps {
  slug: string
  currentUserId?: string
}

export const ImmersiveArenaView: React.FC<ImmersiveArenaViewProps> = ({ slug, currentUserId }) => {
  const { isAuthenticated } = useAuth()
  const { lenser, hasLenser } = useLenser()
  const [chatOpen, setChatOpen] = useState(false)

  const { data: battle, isLoading: battleLoading, error: battleError } = useBattle(slug)
  const { data: contendersData } = useBattleContenders(battle?.id)
  const { data: aggregates } = useVoteAggregates(battle?.id)
  const { currentPhase, isResult } = useBattleStateMachine(battle?.status)
  const submitVote = useSubmitVote(battle?.id)
  // Real-time battle state sync
  useBattleStateSync(battle?.id, slug)

  const renderer = getRenderer('text')

  const contenders = contendersData?.contenders ?? []
  const submissions = contendersData?.submissions ?? []

  const contenderA = contenders.find((c) => c.slot === 'A')
  const contenderB = contenders.find((c) => c.slot === 'B')

  const { data: lensAssignmentA } = useLensAssignment(contenderA?.id)
  const { data: lensAssignmentB } = useLensAssignment(contenderB?.id)

  const submissionA = submissions.find((s) => s.contender_id === contenderA?.id)
  const submissionB = submissions.find((s) => s.contender_id === contenderB?.id)
  const aggA = aggregates?.find((a) => a.contender_id === contenderA?.id)
  const aggB = aggregates?.find((a) => a.contender_id === contenderB?.id)
  const totalVotes = (aggA?.raw_vote_count ?? 0) + (aggB?.raw_vote_count ?? 0)

  const handleVote = async (value: 'contender_a' | 'contender_b' | 'draw', rationale: string) => {
    if (!currentUserId || !contenderA || !contenderB) return
    const votedContenderId = value === 'contender_a' ? contenderA.id : value === 'contender_b' ? contenderB.id : null
    await submitVote.mutateAsync({
      battle_id: battle!.id,
      voter_lenser_id: currentUserId,
      vote_value: value,
      voted_contender_id: votedContenderId,
      rationale,
      is_draw: value === 'draw',
    })
  }

  const winnerSlot = isResult && battle
    ? (() => {
        const aVotes = aggA?.raw_vote_count ?? 0
        const bVotes = aggB?.raw_vote_count ?? 0
        if (aVotes === bVotes) return 'draw' as const
        return aVotes > bVotes ? 'A' as const : 'B' as const
      })()
    : undefined

  if (battleLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-base text-surface-text-muted text-sm">
        Loading battle…
      </div>
    )
  }

  if (battleError || !battle) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-base">
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

  const votePanel = contenderA && contenderB ? (
    <VotePanel
      battleId={battle.id}
      contenderA={{ id: contenderA.id, displayName: contenderA.display_name }}
      contenderB={{ id: contenderB.id, displayName: contenderB.display_name }}
      disabled={!currentUserId}
      voterEligibility={battle.voter_eligibility}
      onVote={handleVote}
    />
  ) : null

  const resultBanner = (
    <ResultBanner
      winnerName={winnerSlot === 'A' ? contenderA?.display_name : winnerSlot === 'B' ? contenderB?.display_name : undefined}
      winnerSlot={winnerSlot}
      voteA={aggA?.raw_vote_count ?? 0}
      voteB={aggB?.raw_vote_count ?? 0}
      forumThreadId={battle.forum_thread_id}
    />
  )

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-surface-base text-surface-text">
      <BattleSEOHead battle={battle} />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Arena panel */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <ArenaTopBar battle={battle} currentPhase={currentPhase} />

          {/* Contender columns + center zone */}
          <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
            <ArenaContenderColumn
              slot="A"
              contender={contenderA}
              submission={submissionA}
              aggregate={aggA}
              renderer={renderer}
              totalVotes={totalVotes}
              battleId={battle.id}
              battleStatus={battle.status}
              currentUserId={currentUserId}
              lensAssignment={lensAssignmentA}
            />
            <ArenaCenterZone
              phase={currentPhase}
              battle={battle}
              renderer={renderer}
              contenderA={contenderA}
              contenderB={contenderB}
              onVote={handleVote}
              currentUserId={currentUserId}
              renderVotePanel={votePanel}
              renderResultBanner={resultBanner}
            />
            <ArenaContenderColumn
              slot="B"
              contender={contenderB}
              submission={submissionB}
              aggregate={aggB}
              renderer={renderer}
              totalVotes={totalVotes}
              battleId={battle.id}
              battleStatus={battle.status}
              currentUserId={currentUserId}
              lensAssignment={lensAssignmentB}
            />
          </div>

        </div>

        {/* Desktop chat rail — hidden on mobile */}
        <div className="hidden md:flex">
          <Suspense fallback={
            <div className="w-72 flex-shrink-0 border-l border-surface-border bg-surface-sunken animate-pulse" />
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

        {/* Mobile: chat drawer */}
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
      </div>
    </div>
  )
}
