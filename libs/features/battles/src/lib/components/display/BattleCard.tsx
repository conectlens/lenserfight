import { Card } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import { Bot, User, Trophy, Swords, Lock } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'

import { BattleStatusBadge } from './BattleStatusBadge'
import { useCountdown } from '../../hooks/utils/useCountdown'

import type { BattleStatus, BattleType, ContenderType, VoterEligibility } from '../../types/battle.types'

const BATTLE_TYPE_LABELS: Record<BattleType, string> = {
  ai_vs_ai: 'AI vs AI',
  human_vs_human_ai_votes: 'H vs H · AI Judge',
  human_vs_human_open_votes: 'H vs H · Open',
  human_vs_ai: 'Human vs AI',
  workflow_battle: 'Workflow',
}

const VOTER_ELIGIBILITY_RESTRICTED: Set<VoterEligibility> = new Set([
  'verified_lenser',
  'lenser_only',
  'ai_only',
])

function ContenderTypeIcon({ type }: { type: ContenderType | null | undefined }) {
  if (type === 'ai_model' || type === 'ai_agent' || type === 'ai_runner') {
    return <Bot size={12} className="text-greyscale-400 flex-shrink-0" />
  }
  return <User size={12} className="text-greyscale-400 flex-shrink-0" />
}

interface BattleCardProps {
  id: string
  slug: string
  title: string
  status: BattleStatus
  totalVoteCount: number
  battleType?: BattleType
  voterEligibility?: VoterEligibility
  votingOpensAt?: string | null
  votingClosesAt?: string | null
  contenderAName?: string | null
  contenderAType?: ContenderType | null
  contenderBName?: string | null
  contenderBType?: ContenderType | null
  winnerSlot?: 'A' | 'B' | null
}

const MotionLink = motion(Link)

export function BattleCard({
  slug,
  title,
  status,
  totalVoteCount,
  battleType,
  voterEligibility,
  votingOpensAt,
  votingClosesAt,
  contenderAName,
  contenderAType,
  contenderBName,
  contenderBType,
  winnerSlot,
}: BattleCardProps) {
  const votingClosesCountdown = useCountdown(
    status === 'voting' ? votingClosesAt : null,
    'Voting closes in'
  )
  const votingOpensCountdown = useCountdown(
    status === 'open' && votingOpensAt ? votingOpensAt : null,
    'Voting opens in'
  )
  const countdown = votingClosesCountdown ?? votingOpensCountdown

  const hasContenders = !!(contenderAName || contenderBName)
  const isRestricted = voterEligibility ? VOTER_ELIGIBILITY_RESTRICTED.has(voterEligibility) : false
  const isFinished = status === 'published' || status === 'closed' || status === 'archived'

  return (
    <MotionLink
      to={`/battles/${slug}`}
      className="block hover:shadow-xl transition-shadow"
      whileHover={{ y: -3 }}
      transition={{ duration: 0.1, ease: [0.4, 0, 0.2, 1] }}
    >
      <Card className="space-y-3 p-4">
        {/* Badge row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            {battleType && (
              <span className="text-[11px] font-semibold text-greyscale-500 dark:text-greyscale-400 bg-surface-raised px-2 py-0.5 rounded-full flex-shrink-0">
                {BATTLE_TYPE_LABELS[battleType]}
              </span>
            )}
            {isRestricted && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-greyscale-500 bg-surface-raised px-2 py-0.5 rounded-full flex-shrink-0">
                <Lock size={10} />
                Restricted
              </span>
            )}
          </div>
          <BattleStatusBadge status={status} />
        </div>

        {/* Title */}
        <h3 className="line-clamp-1 text-base font-bold leading-tight text-greyscale-900 dark:text-greyscale-50">
          {title}
        </h3>

        {/* Winner banner */}
        {isFinished && winnerSlot && (
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
            winnerSlot === 'A'
              ? 'bg-status-green/10 text-status-green'
              : 'bg-primary-yellow-500/10 text-primary-yellow-600'
          }`}>
            <Trophy size={12} />
            {winnerSlot === 'A' ? (contenderAName ?? 'Contender A') : (contenderBName ?? 'Contender B')} wins
          </div>
        )}

        {/* Contender VS row */}
        {hasContenders && (
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 flex items-center gap-1.5 rounded-xl bg-surface-raised px-2.5 py-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary-yellow-500/15 text-[9px] font-black text-primary-yellow-600 flex-shrink-0">A</span>
              <ContenderTypeIcon type={contenderAType} />
              <span className="text-xs font-medium text-greyscale-700 dark:text-greyscale-300 truncate">
                {contenderAName ?? '—'}
              </span>
            </div>
            <Swords size={13} className="text-greyscale-300 dark:text-greyscale-600 flex-shrink-0" />
            <div className="flex-1 min-w-0 flex items-center gap-1.5 rounded-xl bg-surface-raised px-2.5 py-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-status-yellow/15 text-[9px] font-black text-status-yellow flex-shrink-0">B</span>
              <ContenderTypeIcon type={contenderBType} />
              <span className="text-xs font-medium text-greyscale-700 dark:text-greyscale-300 truncate">
                {contenderBName ?? '—'}
              </span>
            </div>
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center justify-between text-xs text-greyscale-500 dark:text-greyscale-400 gap-2">
          {countdown && !countdown.expired ? (
            <span className={`flex items-center gap-1 font-semibold ${countdown.urgent ? 'text-status-red' : ''}`}>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse flex-shrink-0" />
              {countdown.label} {countdown.formatted}
            </span>
          ) : (
            <span />
          )}
          <span className="font-semibold text-greyscale-900 dark:text-greyscale-50 flex-shrink-0">
            {totalVoteCount} vote{totalVoteCount !== 1 ? 's' : ''}
          </span>
        </div>
      </Card>
    </MotionLink>
  )
}
