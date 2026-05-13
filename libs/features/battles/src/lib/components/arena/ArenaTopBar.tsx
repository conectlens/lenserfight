import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, Pencil, Timer } from 'lucide-react'
import { HelpButton } from '@lenserfight/ui/components'
import type { Battle, BattleType, BattleUIPhase } from '../../types/battle.types'
import { useCountdown } from '../../hooks/utils/useCountdown'

const PHASE_LABELS: Record<BattleUIPhase, { label: string; color: string }> = {
  idle:    { label: 'Open', color: 'bg-status-green/10 text-status-green' },
  running: { label: 'Scoring', color: 'bg-status-yellow/10 text-status-yellow' },
  voting:  { label: 'Voting', color: 'bg-primary-yellow-500/10 text-primary-yellow-600' },
  result:  { label: 'Finished', color: 'bg-surface-overlay text-surface-text-muted' },
}

const BATTLE_TYPE_SHORT: Record<BattleType, string> = {
  ai_vs_ai: 'AI vs AI',
  human_vs_human_ai_votes: 'H vs H · AI Judge',
  human_vs_human_open_votes: 'H vs H · Open',
  human_vs_ai: 'Human vs AI',
  workflow_battle: 'Workflow',
  lenser_battle: 'Lenser Battle',
}

const BATTLE_TYPE_DOC_PATH: Record<BattleType, string> = {
  ai_vs_ai:                    '/tutorials/battle-walkthroughs/your-first-battle',
  human_vs_human_ai_votes:     '/tutorials/battle-walkthroughs/your-first-battle',
  human_vs_human_open_votes:   '/tutorials/battle-walkthroughs/your-first-battle',
  human_vs_ai:                 '/tutorials/battle-walkthroughs/your-first-battle',
  workflow_battle:             '/tutorials/battle-walkthroughs/your-first-battle',
  lenser_battle:               '/tutorials/battle-walkthroughs/your-first-battle',
}

interface ArenaTopBarProps {
  battle: Battle
  currentPhase: BattleUIPhase
  spectatorCount?: number
  onRulesOpen?: () => void
  isOwner?: boolean
  myContenderSlot?: 'A' | 'B' | null
}

export const ArenaTopBar: React.FC<ArenaTopBarProps> = ({
  battle,
  currentPhase,
  spectatorCount,
  onRulesOpen,
  isOwner,
  myContenderSlot,
}) => {
  const { label, color } = PHASE_LABELS[currentPhase]

  // Determine the relevant countdown based on phase
  const votingOpensCountdown = useCountdown(
    battle.status === 'open' && battle.voting_opens_at ? battle.voting_opens_at : null,
    'Voting opens in'
  )
  const votingClosesCountdown = useCountdown(
    battle.status === 'voting' ? battle.voting_closes_at : null,
    'Voting closes in'
  )
  const countdown = votingClosesCountdown ?? votingOpensCountdown

  return (
    <div className="h-14 flex-shrink-0 flex items-center gap-3 px-4 border-b border-surface-border bg-surface-base">
      <Link
        to="/battles"
        className="flex items-center gap-1.5 text-surface-text-muted hover:text-surface-text transition-colors text-sm"
      >
        <ArrowLeft size={15} />
        <span className="hidden sm:inline">Battles</span>
      </Link>
      <div className="h-5 w-px bg-surface-border" />
      <h1 className="flex-1 min-w-0 text-sm font-semibold text-surface-text truncate">
        {battle.title}
      </h1>

      {/* Countdown chip */}
      {countdown && !countdown.expired && (
        <span
          className={`hidden sm:flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
            countdown.urgent
              ? 'bg-status-red/10 text-status-red'
              : 'bg-surface-raised text-greyscale-500'
          }`}
        >
          <Timer size={11} />
          {countdown.formatted}
        </span>
      )}

      {/* Category chip */}
      <span className="hidden sm:flex flex-shrink-0 items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-raised text-surface-text-muted border border-surface-border">
        {BATTLE_TYPE_SHORT[battle.battle_type] ?? battle.battle_type}
      </span>

      {/* Phase badge */}
      <span className={`flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${color}`}>
        {label}
      </span>

      {/* Fighter slot chip */}
      {myContenderSlot && (
        <span className="flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary-yellow-500/10 text-primary-yellow-600 border border-primary-yellow-300/50">
          Slot {myContenderSlot}
        </span>
      )}

      {/* Edit button — owner only, editable statuses */}
      {isOwner && (battle.status === 'draft' || battle.status === 'open') && (
        <Link
          to={`/battles/create?battleId=${battle.id}&step=2`}
          className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-semibold text-greyscale-500 hover:text-greyscale-900 dark:hover:text-greyscale-100 transition-colors px-2 py-1 rounded-lg hover:bg-surface-raised"
          aria-label="Edit battle"
        >
          <Pencil size={13} />
          <span className="hidden sm:inline">Edit</span>
        </Link>
      )}

      {/* Rules button */}
      {onRulesOpen && (
        <button
          type="button"
          onClick={onRulesOpen}
          className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-semibold text-greyscale-500 hover:text-greyscale-900 dark:hover:text-greyscale-100 transition-colors px-2 py-1 rounded-lg hover:bg-surface-raised"
          aria-label="View battle rules"
        >
          <BookOpen size={13} />
          <span className="hidden sm:inline">Rules</span>
        </button>
      )}

      <HelpButton
        path={BATTLE_TYPE_DOC_PATH[battle.battle_type] ?? '/tutorials/battle-walkthroughs/your-first-battle'}
        label="How to battle"
        className="hidden sm:inline-flex"
      />

      {spectatorCount != null && spectatorCount > 0 && (
        <span className="hidden sm:flex items-center gap-1 text-[11px] text-surface-text-muted">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-green animate-pulse" />
          {spectatorCount} watching
        </span>
      )}
    </div>
  )
}
