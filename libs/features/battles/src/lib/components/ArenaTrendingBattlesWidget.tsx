import { Card, EmptyState } from '@lenserfight/ui/components'
import { Flame } from 'lucide-react'
import React from 'react'

import { useTrendingBattles } from '../hooks/query/useTrendingBattles'
import { HotBattleCard } from './display/HotBattleCard'

const DISPLAY_COUNT = 4

const SkeletonCard = () => (
  <div className="h-32 rounded-2xl bg-surface-raised animate-pulse" aria-hidden="true" />
)

interface ArenaTrendingBattlesWidgetProps {
  /** Base URL for battle links (e.g. 'https://moon.lenserfight.com'). Empty string for in-app routing. */
  baseUrl?: string
}

export function ArenaTrendingBattlesWidget({ baseUrl = '' }: ArenaTrendingBattlesWidgetProps) {
  const { data, isLoading } = useTrendingBattles()

  const battles = (data?.pages.flat() ?? [])
    .filter((b) => !!b.slug)
    .slice(0, DISPLAY_COUNT)

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-surface-border bg-card/60 px-4 py-3">
        <Flame size={14} aria-hidden="true" className="text-amber-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/70">
          Hot Battles
        </h3>
      </div>

      <div className="p-3 space-y-2">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : battles.length === 0 ? (
          <EmptyState
            icon={Flame}
            title="No trending battles yet"
            description="The hottest battles will appear here as momentum builds."
          />
        ) : (
          battles.map((b) => (
            <HotBattleCard
              key={b.id}
              href={`${baseUrl}/battles/${b.slug}`}
              title={b.title}
              battleType={b.battle_type}
              totalVoteCount={b.total_vote_count}
              voteVelocity={b.vote_velocity}
              contenderAName={b.contender_a_name}
              contenderBName={b.contender_b_name}
              winnerSlot={b.winner_slot}
            />
          ))
        )}
      </div>
    </Card>
  )
}
