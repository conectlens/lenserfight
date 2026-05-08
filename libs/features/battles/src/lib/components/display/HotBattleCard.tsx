import { Card } from '@lenserfight/ui/components'
import { formatCount } from '@lenserfight/utils/number'
import { motion } from 'framer-motion'
import { Bot, User, Swords, Trophy, Flame, TrendingUp } from 'lucide-react'
import React from 'react'

const BATTLE_TYPE_LABELS: Record<string, string> = {
  ai_vs_ai: 'AI vs AI',
  human_vs_human_ai_votes: 'H vs H · AI Judge',
  human_vs_human_open_votes: 'H vs H · Open',
  human_vs_ai: 'Human vs AI',
  workflow_battle: 'Workflow',
}

function ContenderIcon({ isAi }: { isAi: boolean }) {
  return isAi
    ? <Bot size={12} className="text-greyscale-400 flex-shrink-0" />
    : <User size={12} className="text-greyscale-400 flex-shrink-0" />
}

export interface HotBattleCardProps {
  /** Full URL to navigate to on click (caller provides baseUrl + path) */
  href: string
  title: string
  battleType?: string | null
  totalVoteCount: number
  /** Votes per hour from the trending RPC */
  voteVelocity: number
  contenderAName?: string | null
  contenderBName?: string | null
  winnerSlot?: 'A' | 'B' | null
}

const MotionAnchor = motion.a

export function HotBattleCard({
  href,
  title,
  battleType,
  totalVoteCount,
  voteVelocity,
  contenderAName,
  contenderBName,
  winnerSlot,
}: HotBattleCardProps) {
  const hasContenders = !!(contenderAName || contenderBName)
  const isFinished = !!winnerSlot

  return (
    <MotionAnchor
      href={href}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-2xl"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.1, ease: [0.4, 0, 0.2, 1] }}
    >
      <Card className="relative space-y-3 p-4 overflow-hidden border-l-4 border-l-amber-500 hover:shadow-xl transition-shadow">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-amber-500/60 via-yellow-400/30 to-transparent" />

        {/* Badge row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0">
            {battleType && BATTLE_TYPE_LABELS[battleType] && (
              <span className="text-[11px] font-semibold text-greyscale-500 dark:text-greyscale-400 bg-surface-raised px-2 py-0.5 rounded-full flex-shrink-0">
                {BATTLE_TYPE_LABELS[battleType]}
              </span>
            )}
            <span
              className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full flex-shrink-0"
              aria-label="Trending battle"
            >
              <Flame size={10} aria-hidden="true" />
              Trending
            </span>
          </div>
          {voteVelocity > 0 && (
            <span
              className="flex items-center gap-1 text-[11px] font-semibold text-greyscale-500 dark:text-greyscale-400 flex-shrink-0"
              aria-label={`${voteVelocity} votes per hour`}
            >
              <TrendingUp size={11} aria-hidden="true" />
              +{voteVelocity}/hr
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="line-clamp-1 text-base font-bold leading-tight text-greyscale-900 dark:text-greyscale-50">
          {title}
        </h3>

        {/* Winner banner */}
        {isFinished && (
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
            winnerSlot === 'A'
              ? 'bg-status-green/10 text-status-green'
              : 'bg-primary-yellow-500/10 text-primary-yellow-600'
          }`}>
            <Trophy size={12} aria-hidden="true" />
            {winnerSlot === 'A' ? (contenderAName ?? 'Contender A') : (contenderBName ?? 'Contender B')} wins
          </div>
        )}

        {/* Contenders */}
        {hasContenders && !isFinished && (
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 flex items-center gap-1.5 rounded-xl bg-surface-raised px-2.5 py-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary-yellow-500/15 text-[9px] font-black text-primary-yellow-600 flex-shrink-0">
                A
              </span>
              <ContenderIcon isAi={false} />
              <span className="text-xs font-medium text-greyscale-700 dark:text-greyscale-300 truncate">
                {contenderAName ?? '—'}
              </span>
            </div>
            <Swords size={13} className="text-greyscale-300 dark:text-greyscale-600 flex-shrink-0" />
            <div className="flex-1 min-w-0 flex items-center gap-1.5 rounded-xl bg-surface-raised px-2.5 py-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-status-yellow/15 text-[9px] font-black text-status-yellow flex-shrink-0">
                B
              </span>
              <ContenderIcon isAi={false} />
              <span className="text-xs font-medium text-greyscale-700 dark:text-greyscale-300 truncate">
                {contenderBName ?? '—'}
              </span>
            </div>
          </div>
        )}

        {/* Vote count */}
        <div className="flex items-center justify-end text-xs">
          <span className="font-semibold text-greyscale-900 dark:text-greyscale-50">
            {formatCount(totalVoteCount)} vote{totalVoteCount !== 1 ? 's' : ''}
          </span>
        </div>
      </Card>
    </MotionAnchor>
  )
}
