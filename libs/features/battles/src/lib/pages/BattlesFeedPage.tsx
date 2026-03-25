import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SEOHead } from '@lenserfight/ui/components'
import { useBattlesFeed } from '../hooks/useBattlesFeed'
import { BattleCard } from '../components/BattleCard'

const FILTERS = ['all', 'open', 'voting', 'published', 'closed'] as const

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
  const [filter, setFilter] = useState<string>('all')
  const { data: battles = [], isLoading } = useBattlesFeed(filter)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SEOHead type="battles-list" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--cl-surface-text)]">Battles</h1>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                filter === f
                  ? 'bg-[var(--cl-surface-text)] text-[var(--cl-surface-base)] border-[var(--cl-surface-text)]'
                  : 'bg-[var(--cl-surface-base)] text-[var(--cl-surface-text-muted)] border-[var(--cl-surface-border)] hover:border-[var(--cl-surface-border-subtle)]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-[var(--cl-surface-raised)] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : battles.length === 0 ? (
        <div className="text-center py-16 text-[var(--cl-surface-text-disabled)]">
          <p className="text-4xl mb-3">⚔️</p>
          <p className="font-medium">No battles yet.</p>
          <p className="text-sm mt-1">Be the first to create one.</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {battles.map((b, i) => (
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
                />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
