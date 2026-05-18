import { ArtifactLifecycleStatusBadge } from '@lenserfight/features/artifact-lifecycle'
import { Card } from '@lenserfight/ui/components'
import { formatCount } from '@lenserfight/utils/number'
import { motion } from 'framer-motion'
import { Bot, User, Swords } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'

import { useCountdown } from '../../hooks/utils/useCountdown'
import type { BattleType, ContenderType } from '../../types/battle.types'

const BATTLE_TYPE_LABELS: Record<BattleType, string> = {
  ai_vs_ai: 'AI vs AI',
  human_vs_human_ai_votes: 'H vs H · AI Judge',
  human_vs_human_open_votes: 'H vs H · Open',
  human_vs_ai: 'Human vs AI',
  workflow_battle: 'Workflow',
  lenser_battle: 'Lenser Battle',
}

function ContenderIcon({ type }: { type: ContenderType | null | undefined }) {
  if (type === 'ai_model' || type === 'ai_agent' || type === 'ai_runner') {
    return <Bot size={12} className="text-greyscale-400 flex-shrink-0" />
  }
  return <User size={12} className="text-greyscale-400 flex-shrink-0" />
}

export interface LiveBattleCardProps {
  slug: string
  title: string
  battleType?: BattleType
  votingClosesAt?: string | null
  totalVoteCount: number
  contenderAName?: string | null
  contenderAType?: ContenderType | null
  contenderBName?: string | null
  contenderBType?: ContenderType | null
  archivedAt?: string | null
  deletedAt?: string | null
}

const MotionLink = motion.create(Link)

export function LiveBattleCard({
  slug,
  title,
  battleType,
  votingClosesAt,
  totalVoteCount,
  contenderAName,
  contenderAType,
  contenderBName,
  contenderBType,
  archivedAt,
  deletedAt,
}: LiveBattleCardProps) {
  const countdown = useCountdown(votingClosesAt, 'Closes in')
  const hasContenders = !!(contenderAName || contenderBName)

  return (
    <MotionLink
      to={`/battles/${slug}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-2xl"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.1, ease: [0.4, 0, 0.2, 1] }}
    >
      <Card className="relative space-y-3 p-4 overflow-hidden border-l-4 border-l-red-500 hover:shadow-xl transition-shadow">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-red-500/60 via-orange-400/30 to-transparent" />

        {/* Badge row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-shrink-0 min-w-0">
            {battleType && (
              <span className="text-[11px] font-semibold text-greyscale-500 dark:text-greyscale-400 bg-surface-raised px-2 py-0.5 rounded-full flex-shrink-0">
                {BATTLE_TYPE_LABELS[battleType]}
              </span>
            )}
            <ArtifactLifecycleStatusBadge archivedAt={archivedAt} deletedAt={deletedAt} pinned={false} />
          </div>
          <span
            className="flex items-center gap-1.5 ml-auto flex-shrink-0 text-[11px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full"
            aria-label="Live battle — voting in progress"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
            LIVE
          </span>
        </div>

        {/* Title */}
        <h3 className="line-clamp-1 text-base font-bold leading-tight text-greyscale-900 dark:text-greyscale-50">
          {title}
        </h3>

        {/* Contenders */}
        {hasContenders && (
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 flex items-center gap-1.5 rounded-xl bg-surface-raised px-2.5 py-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary-yellow-500/15 text-[9px] font-black text-primary-yellow-600 flex-shrink-0">
                A
              </span>
              <ContenderIcon type={contenderAType} />
              <span className="text-xs font-medium text-greyscale-700 dark:text-greyscale-300 truncate">
                {contenderAName ?? '—'}
              </span>
            </div>
            <Swords size={13} className="text-greyscale-300 dark:text-greyscale-600 flex-shrink-0" />
            <div className="flex-1 min-w-0 flex items-center gap-1.5 rounded-xl bg-surface-raised px-2.5 py-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-status-yellow/15 text-[9px] font-black text-status-yellow flex-shrink-0">
                B
              </span>
              <ContenderIcon type={contenderBType} />
              <span className="text-xs font-medium text-greyscale-700 dark:text-greyscale-300 truncate">
                {contenderBName ?? '—'}
              </span>
            </div>
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center justify-between text-xs text-greyscale-500 dark:text-greyscale-400 gap-2">
          {countdown && !countdown.expired ? (
            <span className={`flex items-center gap-1 font-semibold ${countdown.urgent ? 'text-red-500' : ''}`}>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse flex-shrink-0" />
              {countdown.label} {countdown.formatted}
            </span>
          ) : (
            <span />
          )}
          <span className="font-semibold text-greyscale-900 dark:text-greyscale-50 flex-shrink-0">
            {formatCount(totalVoteCount)} vote{totalVoteCount !== 1 ? 's' : ''}
          </span>
        </div>
      </Card>
    </MotionLink>
  )
}
