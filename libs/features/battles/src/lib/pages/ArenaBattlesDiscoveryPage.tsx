import { EmptyState, InfiniteScrollSentinel, PageHeader, SEOHead } from '@lenserfight/ui/components'
import { AnimatePresence, motion } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { Outlet } from 'react-router-dom'

import { BattleCard } from '../components/display/BattleCard'
import { SpectatorFeedWidget } from '../components/SpectatorFeedWidget'
import { useBattlesFeed } from '../hooks/query/useBattlesFeed'

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

// Phase O2 — Arena discovery
//
// Surfaces finalized public battles in the arena discovery view.
// Distinct from BattlesFeedPage (creator/contender flows) — this
// view is read-only and shaped for spectators.
//
// Status filter is hard-coded to 'published' (the terminal "voting closed +
// finalized" state recognised by the existing feed RPC). Sort is locked to
// 'most_votes' to prioritise high-engagement battles in discovery.
export function ArenaBattlesDiscoveryPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useBattlesFeed(
    'published',
    'most_votes',
    'all'
  )

  const battles = data?.pages.flat() ?? []

  return (
    <div>
      <SEOHead type="battles-list" />
      <PageHeader
        title="Arena"
        description="Finalized battles from across the platform — ranked by community votes."
      />

      <div className="flex items-center gap-2 mb-6 text-sm text-greyscale-500">
        <Trophy size={14} />
        <span>Showing finalized public battles only.</span>
      </div>

      {/* V5 — Live public battles spectator widget */}
      <div className="mb-6">
        <SpectatorFeedWidget />
      </div>

      {isLoading ? (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="break-inside-avoid mb-3 h-40 bg-[var(--cl-surface-raised)] rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : battles.length === 0 ? (
        <EmptyState
          title="No finalized battles yet."
          description="As public battles complete and are voted on, they will appear here."
        />
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-3">
            {battles.map((b, i) => (
              <motion.div
                key={b.id}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="break-inside-avoid mb-3"
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
          </div>
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
