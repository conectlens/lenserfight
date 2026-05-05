import React from 'react'
import { useParams } from 'react-router-dom'

import { ArenaView } from '../components/arena/ArenaView'
import { BattleShareCard } from '../components/display/BattleShareCard'
import { BattleStatusBadge } from '../components/display/BattleStatusBadge'
import { ContenderSlot } from '../components/submission/ContenderSlot'
import { ResultBanner } from '../components/scoring/ResultBanner'
import { RubricPanel } from '../components/scoring/RubricPanel'
import { VotePanel } from '../components/scoring/VotePanel'

import type { BattleStatus } from '../types/battle.types'

export function BattleResultPage() {
  const { slug } = useParams<{ slug: string }>()

  return (
    <ArenaView
      slug={slug ?? ''}
      forcePhase="result"
      renderContenderSlot={(props) => (
        <ContenderSlot
          slot={props.slot}
          displayName={props.displayName}
          contenderType={props.contenderType}
          contentText={props.contentText}
          contentUrl={props.contentUrl}
          voteCount={props.voteCount}
          votePercentage={props.votePercentage}
        />
      )}
      renderVotePanel={(props) => (
        <VotePanel
          battleId={props.battleId}
          contenderA={props.contenderA}
          contenderB={props.contenderB}
          disabled={props.disabled}
          onVote={props.onVote}
          voterEligibility={props.voterEligibility}
          isEligible={props.isEligible}
        />
      )}
      renderRubricPanel={(props) => (
        <RubricPanel
          criteria={props.criteria}
          scorecardA={props.scorecardA}
          scorecardB={props.scorecardB}
        />
      )}
      renderResultBanner={(props) => (
        <ResultBanner
          winnerName={props.winnerName}
          winnerSlot={props.winnerSlot}
          voteA={props.voteA}
          voteB={props.voteB}
        />
      )}
      renderShareCard={(props) => (
        <BattleShareCard
          battleSlug={props.battleSlug}
          battleTitle={props.battleTitle}
          winnerName={props.winnerName}
          ogImageUrl={props.ogImageUrl}
        />
      )}
      renderStatusBadge={(props) => (
        <BattleStatusBadge status={props.status as BattleStatus} />
      )}
    />
  )
}
