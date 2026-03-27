import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { Battle, BattleUIPhase } from '../types/battle.types'

const PHASE_LABELS: Record<BattleUIPhase, { label: string; color: string }> = {
  idle:    { label: 'Open', color: 'bg-status-green/10 text-status-green' },
  running: { label: 'Scoring', color: 'bg-status-yellow/10 text-status-yellow' },
  voting:  { label: 'Voting', color: 'bg-primary-yellow-500/10 text-primary-yellow-600' },
  result:  { label: 'Finished', color: 'bg-surface-overlay text-surface-text-muted' },
}

interface ArenaTopBarProps {
  battle: Battle
  currentPhase: BattleUIPhase
  spectatorCount?: number
}

export const ArenaTopBar: React.FC<ArenaTopBarProps> = ({ battle, currentPhase, spectatorCount }) => {
  const { label, color } = PHASE_LABELS[currentPhase]

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
      <span className={`flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${color}`}>
        {label}
      </span>
      {spectatorCount != null && spectatorCount > 0 && (
        <span className="hidden sm:flex items-center gap-1 text-[11px] text-surface-text-muted">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-green animate-pulse" />
          {spectatorCount} watching
        </span>
      )}
    </div>
  )
}
