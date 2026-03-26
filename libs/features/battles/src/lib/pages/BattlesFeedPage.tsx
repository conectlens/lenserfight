import { SEOHead } from '@lenserfight/ui/components'
import { AnimatePresence, motion } from 'framer-motion'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle } from 'lucide-react'

import { BattleCard } from '../components/BattleCard'
import { useBattlesFeed } from '../hooks/useBattlesFeed'

import type { BattleType } from '../types/battle.types'

const STATUS_FILTERS = ['all', 'open', 'voting', 'published', 'closed'] as const

const TYPE_FILTERS: { value: BattleType | 'all'; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'human_vs_human_open_votes', label: 'H vs H' },
  { value: 'human_vs_ai', label: 'Human vs AI' },
  { value: 'ai_vs_ai', label: 'AI vs AI' },
  { value: 'human_vs_human_ai_votes', label: 'AI Judge' },
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

const filterBtnClass = (active: boolean) =>
  `text-xs px-3 py-1.5 rounded-full border transition-all ${
    active
      ? 'bg-[var(--cl-surface-text)] text-[var(--cl-surface-base)] border-[var(--cl-surface-text)]'
      : 'bg-[var(--cl-surface-base)] text-[var(--cl-surface-text-muted)] border-[var(--cl-surface-border)] hover:border-[var(--cl-surface-border-subtle)]'
  }`

export function BattlesFeedPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<BattleType | 'all'>('all')
  const { data: battles = [], isLoading } = useBattlesFeed(statusFilter)

  const filtered = typeFilter === 'all'
    ? battles
    : battles.filter((b) => b.battle_type === typeFilter)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SEOHead type="battles-list" />
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--cl-surface-text)]">Battles</h1>
          <button
            onClick={() => navigate('/battles/create')}
            className="flex items-center gap-2 bg-primary hover:bg-yellow-300 text-gray-900 font-semibold rounded-lg px-4 py-2 transition-colors"
            title="New Battle"
          >
            <PlusCircle size={18} />
            <span>New Battle</span>
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={filterBtnClass(statusFilter === f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              className={filterBtnClass(typeFilter === t.value)}
            >
              {t.label}
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
    </div>
  )
}
