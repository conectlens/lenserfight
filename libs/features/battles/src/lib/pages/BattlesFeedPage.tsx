import { Button, EmptyState, InfiniteScrollSentinel, PageHeader, SEOHead } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { AnimatePresence, motion } from 'framer-motion'
import React from 'react'
import { useNavigate, Outlet, useSearchParams } from 'react-router-dom'
import { PlusCircle, Zap } from 'lucide-react'

import { BattleCard } from '../components/BattleCard'
import { useBattlesFeed } from '../hooks/useBattlesFeed'
import type { BattlesFeedSortBy } from '../hooks/useBattlesFeed'

import type { BattleType } from '../types/battle.types'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'voting', label: 'Voting' },
  { value: 'published', label: 'Published' },
  { value: 'closed', label: 'Closed' },
]

const TYPE_OPTIONS: { value: BattleType | 'all'; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'human_vs_human_open_votes', label: 'H vs H' },
  { value: 'human_vs_ai', label: 'Human vs AI' },
  { value: 'ai_vs_ai', label: 'AI vs AI' },
  { value: 'human_vs_human_ai_votes', label: 'AI Judge' },
  { value: 'workflow_battle', label: 'Workflow' },
]

const SORT_OPTIONS: { value: BattlesFeedSortBy; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'most_votes', label: 'Most votes' },
  { value: 'trending', label: 'Trending' },
]

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: [0, 0, 0.2, 1] as [number, number, number, number],
    },
  }),
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
}

export function BattlesFeedPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const statusFilter = searchParams.get('status') ?? 'all'
  const typeFilter = (searchParams.get('type') as BattleType | 'all') ?? 'all'
  const sortBy = (searchParams.get('sort') as BattlesFeedSortBy) ?? 'newest'

  const setParam = (key: string, value: string, defaultValue: string) => {
    setSearchParams(
      (prev) => {
        if (value !== defaultValue) prev.set(key, value)
        else prev.delete(key)
        return prev
      },
      { replace: true }
    )
  }

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useBattlesFeed(
    statusFilter,
    sortBy,
    typeFilter
  )

  const battles = data?.pages.flat() ?? []

  // Client-side sort for most_votes / trending (RPC returns newest-first only)
  const sorted = sortBy === 'most_votes' || sortBy === 'trending'
    ? [...battles].sort((a, b) => (b.total_vote_count ?? 0) - (a.total_vote_count ?? 0))
    : battles

  return (
    <div className="">
      <SEOHead type="battles-list" />
      <PageHeader
        title="Battles"
        description="Watch humans and AI go head-to-head — vote on the best response."
        action={
          <Button
            onClick={() => navigate('/battles/create')}
            title="New Battle"
            className="flex items-center gap-2 w-auto"
          >
            <PlusCircle size={18} />
            <span>New Battle</span>
          </Button>
        }
      />
      <div className="sticky top-[56px] z-20 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur py-3 border-b border-gray-100/50 dark:border-gray-800/50 transition-all mb-6 -mx-2 sm:-mx-4 lg:-mx-8 px-2 sm:px-4 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          {/* Live quick-filter chip */}
          <button
            type="button"
            onClick={() => setParam('status', statusFilter === 'voting' ? 'all' : 'voting', 'all')}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              statusFilter === 'voting'
                ? 'bg-primary-yellow-500/10 border-primary-yellow-500/40 text-primary-yellow-600'
                : 'bg-surface-raised border-surface-border text-greyscale-500 hover:border-greyscale-400'
            }`}
          >
            <Zap size={12} />
            Live
            {statusFilter === 'voting' && (
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary-yellow-500 animate-pulse" />
            )}
          </button>

          <SelectField
            value={statusFilter}
            onChange={(v) => setParam('status', v, 'all')}
            options={STATUS_OPTIONS}
            className="w-40"
          />
          <SelectField
            value={typeFilter}
            onChange={(v) => setParam('type', v, 'all')}
            options={TYPE_OPTIONS}
            className="w-44"
          />
          <SelectField
            value={sortBy}
            onChange={(v) => setParam('sort', v, 'newest')}
            options={SORT_OPTIONS}
            className="w-36"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 bg-[var(--cl-surface-raised)] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No battles yet."
          description="Be the first to create one."
        />
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sorted.map((b, i) => (
              <motion.div
                key={b.id}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
              >
                <BattleCard
                  id={b.id}
                  slug={b.slug}
                  title={b.title}
                  status={b.status}
                  totalVoteCount={b.total_vote_count}
                  battleType={b.battle_type}
                  voterEligibility={b.voter_eligibility}
                  votingOpensAt={b.voting_opens_at}
                  votingClosesAt={b.voting_closes_at}
                  contenderAName={b.contender_a_name}
                  contenderAType={b.contender_a_type}
                  contenderBName={b.contender_b_name}
                  contenderBType={b.contender_b_type}
                  winnerSlot={b.winner_slot}
                />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
      <InfiniteScrollSentinel
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
      <Outlet />
    </div>
  )
}
