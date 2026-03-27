import { SEOHead } from '@lenserfight/ui/components'
import { Button } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { AnimatePresence, motion } from 'framer-motion'
import React from 'react'
import { useNavigate, Outlet, useSearchParams } from 'react-router-dom'
import { PlusCircle } from 'lucide-react'

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

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useBattlesFeed(statusFilter, sortBy)

  const battles = data?.pages.flat() ?? []
  const filtered = typeFilter === 'all'
    ? battles
    : battles.filter((b) => b.battle_type === typeFilter)

  return (
    <div className="">
      <SEOHead type="battles-list" />
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--cl-surface-text)]">Battles</h1>
          <Button
            onClick={() => navigate('/battles/create')}
            title="New Battle"
            className="flex items-center gap-2 w-auto"
          >
            <PlusCircle size={18} />
            <span>New Battle</span>
          </Button>
        </div>
        <div className="flex flex-wrap gap-3">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-[var(--cl-surface-raised)] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--cl-surface-text-disabled)]">
          <p className="text-4xl mb-3">⚔️</p>
          <p className="font-medium">No battles yet.</p>
          <p className="text-sm mt-1">Be the first to create one.</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((b, i) => (
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
                  taskPrompt={b.task_prompt}
                  status={b.status}
                  totalVoteCount={b.total_vote_count}
                  publishedAt={b.published_at}
                  battleType={b.battle_type}
                />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="secondary"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            isLoading={isFetchingNextPage}
            className="w-auto"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
      <Outlet />
    </div>
  )
}
