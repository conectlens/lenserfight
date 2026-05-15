import { Button, EmptyState, ExperimentalBadge, HelpButton, InfiniteScrollSentinel, PageHeader, SEOHead } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import React from 'react'
import { useNavigate, Outlet, useSearchParams } from 'react-router-dom'
import { ArrowRight, ImageIcon, PlusCircle, Swords, Video, Vote, Zap } from 'lucide-react'

import { BattleCard } from '../components/display/BattleCard'
import { useBattlesFeed } from '../hooks/query/useBattlesFeed'
import type { BattlesFeedSortBy } from '../hooks/query/useBattlesFeed'

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

const CONTENT_TYPE_OPTIONS = [
  { value: 'all', label: 'All media' },
  { value: 'text', label: 'Text' },
  { value: 'code', label: 'Code' },
  { value: 'image', label: 'Image' },
  { value: 'drawing', label: 'Drawing' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'avatar', label: 'Avatar' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'poem', label: 'Poem' },
  { value: 'image_edit', label: 'Image Edit' },
]

const SORT_OPTIONS: { value: BattlesFeedSortBy; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'most_votes', label: 'Most votes' },
  { value: 'trending', label: 'Trending' },
]

export function BattlesFeedPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const statusFilter = searchParams.get('status') ?? 'all'
  const typeFilter = (searchParams.get('type') as BattleType | 'all') ?? 'all'
  const contentTypeFilter = searchParams.get('content') ?? 'all'
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
  const sorted = (sortBy === 'most_votes' || sortBy === 'trending'
    ? [...battles].sort((a, b) => (b.total_vote_count ?? 0) - (a.total_vote_count ?? 0))
    : battles
  ).filter((b) => contentTypeFilter === 'all' || b.content_type === contentTypeFilter)

  return (
    <div className="">
      <SEOHead type="battles-list" />
      <PageHeader
        title={<span className="inline-flex items-center gap-2">Battles <ExperimentalBadge mode="inline" title="Experimental" /></span>}
        description="Create a task, compare human and AI outputs, vote on criteria, and reveal a winner."
        action={
          <>
            <HelpButton path="/tutorials/battle-walkthroughs/your-first-battle" label="Start your first battle" />
            <Button
              onClick={() => navigate('/battles/create')}
              title="New Battle"
              className="flex items-center gap-2 w-auto"
            >
              <PlusCircle size={18} />
              <span>New Battle</span>
            </Button>
          </>
        }
      />
      <ExperimentalBadge
        title="Battles"
        description="Battles work end-to-end, but matchmaking, voting and result flows haven't been fully tested. Please try them and report anything that feels wrong — I'd rather hear it from you than miss it."
        className="mb-4"
      />
      <div className="sticky top-[56px] z-20 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur py-3 border-b border-gray-100/50 dark:border-gray-800/50 transition-all mb-6 -mx-2 sm:-mx-4 lg:-mx-8 px-2 sm:px-4 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          {/* Live quick-filter chip */}
          <button
            type="button"
            onClick={() => setParam('status', statusFilter === 'voting' ? 'all' : 'voting', 'all')}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${statusFilter === 'voting'
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
            value={contentTypeFilter}
            onChange={(v) => setParam('content', v, 'all')}
            options={CONTENT_TYPE_OPTIONS}
            className="w-36"
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
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="break-inside-avoid mb-3 h-40 bg-[var(--cl-surface-raised)] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No battles yet — be the first"
          description="Pick a task, add two contenders (human or AI), and let the community vote on the best output. Takes less than 2 minutes."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button variant="primary" size="sm" onClick={() => navigate('/battles/create')}>
                Start your first battle →
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/battles/templates')}>
                Browse templates
              </Button>
              <HelpButton path="/tutorials/battle-walkthroughs/your-first-battle" label="How it works" />
            </div>
          }
        />
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-3">
          {sorted.map((b) => (
            <div key={b.id} className="break-inside-avoid mb-3">
              <BattleCard
                id={b.id}
                slug={b.slug}
                title={b.title}
                status={b.status}
                totalVoteCount={b.total_vote_count}
                battleType={b.battle_type}
                contentType={b.content_type}
                voterEligibility={b.voter_eligibility}
                votingOpensAt={b.voting_opens_at}
                votingClosesAt={b.voting_closes_at}
                contenderAName={b.contender_a_name}
                contenderAType={b.contender_a_type}
                contenderBName={b.contender_b_name}
                contenderBType={b.contender_b_type}
                winnerSlot={b.winner_slot}
              />
            </div>
          ))}
        </div>
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
