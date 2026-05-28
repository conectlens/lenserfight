import { EmptyState, InfiniteScrollSentinel, SEOHead } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import { Flame, Trophy, TrendingUp, Clock } from 'lucide-react'
import React, { useState } from 'react'
import { Link } from 'react-router-dom'

import { useBattlesFeed } from '../hooks/query/useBattlesFeed'
import { useTrendingBattles } from '../hooks/query/useTrendingBattles'
import { BattleStatusBadge } from '../components/display/BattleStatusBadge'
import type { TrendingBattleRecord } from '@lenserfight/data/repositories'

type TabId = 'trending' | 'most_voted' | 'recent'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'trending',   label: 'Trending',    icon: <Flame size={14} /> },
  { id: 'most_voted', label: 'Most Voted',  icon: <Trophy size={14} /> },
  { id: 'recent',     label: 'Recent',      icon: <Clock size={14} /> },
]

function VelocityBar({ velocity }: { velocity: number }) {
  const pct = Math.min(100, Math.round(velocity * 10))
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-greyscale-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-yellow-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-greyscale-400 tabular-nums">
        {velocity.toFixed(2)}/h
      </span>
    </div>
  )
}

function TrendingBattleRow({ battle, rank }: { battle: TrendingBattleRecord; rank: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.04, duration: 0.25 }}
    >
      <Link
        to={`/battles/${battle.slug}`}
        className="flex items-center gap-4 rounded-xl border border-greyscale-800 bg-greyscale-900 p-4 hover:border-greyscale-600 hover:bg-greyscale-800 transition-colors"
      >
        <span className="w-7 shrink-0 text-center text-sm font-bold text-greyscale-500">
          {rank + 1}
        </span>

        {battle.og_image_url ? (
          <img
            src={battle.og_image_url}
            alt=""
            className="h-12 w-20 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="h-12 w-20 shrink-0 rounded-lg bg-greyscale-800 flex items-center justify-center">
            <TrendingUp size={16} className="text-greyscale-600" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-greyscale-100 truncate">{battle.title}</p>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-greyscale-400">
              {battle.contender_a_name ?? '?'} vs {battle.contender_b_name ?? '?'}
            </span>
            {battle.winner_slot && (
              <span className="text-[11px] font-semibold text-yellow-400">
                Winner: {battle.winner_slot === 'A' ? battle.contender_a_name : battle.contender_b_name}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <BattleStatusBadge status={battle.status as 'published' | 'voting' | 'draft'} />
          <VelocityBar velocity={battle.vote_velocity} />
          <span className="text-[11px] text-greyscale-500">
            {battle.total_vote_count.toLocaleString()} votes
          </span>
        </div>
      </Link>
    </motion.div>
  )
}

function TrendingTab() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useTrendingBattles()
  const battles = data?.pages.flat() ?? []

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-greyscale-800 animate-pulse" />
        ))}
      </div>
    )
  }

  if (battles.length === 0) {
    return (
      <EmptyState
        icon={<Flame size={32} className="text-greyscale-600" />}
        title="No trending battles"
        description="Published battles with votes will appear here."
      />
    )
  }

  return (
    <div className="space-y-3">
      {battles.map((b, i) => (
        <TrendingBattleRow key={b.id} battle={b} rank={i} />
      ))}
      <InfiniteScrollSentinel
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={fetchNextPage}
      />
    </div>
  )
}

function MostVotedTab() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useBattlesFeed(
    'published',
    'most_votes'
  )
  const battles = data?.pages.flat() ?? []

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-greyscale-800 animate-pulse" />
        ))}
      </div>
    )
  }

  if (battles.length === 0) {
    return (
      <EmptyState
        icon={<Trophy size={32} className="text-greyscale-600" />}
        title="No battles yet"
        description="Published battles will appear here sorted by votes."
      />
    )
  }

  return (
    <div className="space-y-3">
      {battles.map((b, i) => (
        <motion.div
          key={b.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.25 }}
        >
          <Link
            to={`/battles/${b.slug}`}
            className="flex items-center gap-4 rounded-xl border border-greyscale-800 bg-greyscale-900 p-4 hover:border-greyscale-600 hover:bg-greyscale-800 transition-colors"
          >
            <span className="w-7 shrink-0 text-center text-sm font-bold text-greyscale-500">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-greyscale-100 truncate">{b.title}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-greyscale-400">
                  {b.contender_a_name ?? '?'} vs {b.contender_b_name ?? '?'}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <BattleStatusBadge status={b.status as 'published'} />
              <span className="text-xs font-semibold text-greyscale-300">
                {b.total_vote_count.toLocaleString()} votes
              </span>
            </div>
          </Link>
        </motion.div>
      ))}
      <InfiniteScrollSentinel
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={fetchNextPage}
      />
    </div>
  )
}

function RecentTab() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useBattlesFeed(
    'published',
    'newest'
  )
  const battles = data?.pages.flat() ?? []

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-greyscale-800 animate-pulse" />
        ))}
      </div>
    )
  }

  if (battles.length === 0) {
    return (
      <EmptyState
        icon={<Clock size={32} className="text-greyscale-600" />}
        title="No recent battles"
        description="New published battles will appear here."
      />
    )
  }

  return (
    <div className="space-y-3">
      {battles.map((b, i) => (
        <motion.div
          key={b.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.25 }}
        >
          <Link
            to={`/battles/${b.slug}`}
            className="flex items-center gap-4 rounded-xl border border-greyscale-800 bg-greyscale-900 p-4 hover:border-greyscale-600 hover:bg-greyscale-800 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-greyscale-100 truncate">{b.title}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-greyscale-400">
                  {b.contender_a_name ?? '?'} vs {b.contender_b_name ?? '?'}
                </span>
                {b.published_at && (
                  <span className="text-[11px] text-greyscale-600">
                    {new Date(b.published_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <BattleStatusBadge status={b.status as 'published'} />
              <span className="text-xs text-greyscale-400">
                {b.total_vote_count.toLocaleString()} votes
              </span>
            </div>
          </Link>
        </motion.div>
      ))}
      <InfiniteScrollSentinel
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={fetchNextPage}
      />
    </div>
  )
}

export function BattleLenserboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>('trending')

  return (
    <>
      <SEOHead
        title="Lenserboard — LenserFight"
        description="Discover trending AI battles sorted by vote velocity, community votes, and recency."
      />

      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Flame size={22} className="text-yellow-400" />
          <h1 className="text-xl font-bold text-greyscale-100">Lenserboard</h1>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-greyscale-800 bg-greyscale-900 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-greyscale-700 text-greyscale-100'
                  : 'text-greyscale-400 hover:text-greyscale-200',
              ].join(' ')}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'trending'   && <TrendingTab />}
        {activeTab === 'most_voted' && <MostVotedTab />}
        {activeTab === 'recent'     && <RecentTab />}
      </div>
    </>
  )
}
