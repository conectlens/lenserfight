import React from 'react'
import { useParams } from 'react-router-dom'
import { ArenaView } from '../components/ArenaView'
import { ContenderSlot } from '../components/ContenderSlot'
import { VotePanel } from '../components/VotePanel'
import { RubricPanel } from '../components/RubricPanel'
import { ResultBanner } from '../components/ResultBanner'
import { BattleShareCard } from '../components/BattleShareCard'
import { BattleStatusBadge } from '../components/BattleStatusBadge'

export function BattleDetailPage() {
  const { slug } = useParams<{ slug: string }>()

  return (
    <ArenaView
      slug={slug ?? ''}
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
        <BattleShareCard battleSlug={props.battleSlug} battleTitle={props.battleTitle} />
      )}
      renderStatusBadge={(props) => (
        <BattleStatusBadge status={props.status as any} />
      )}
    />
  )
}
