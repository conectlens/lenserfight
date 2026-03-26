import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { Battle, BattleUIPhase } from '../types/battle.types'

const PHASE_LABELS: Record<BattleUIPhase, { label: string; color: string }> = {
  idle:    { label: 'Open', color: 'bg-status-green/10 text-status-green' },
  running: { label: 'Scoring', color: 'bg-status-yellow/10 text-status-yellow' },
  voting:  { label: 'Voting', color: 'bg-status-blue/10 text-status-blue' },
  result:  { label: 'Finished', color: 'bg-greyscale-200 text-greyscale-500 dark:bg-greyscale-700 dark:text-greyscale-400' },
}

interface ArenaTopBarProps {
  battle: Battle
  currentPhase: BattleUIPhase
  spectatorCount?: number
}

export const ArenaTopBar: React.FC<ArenaTopBarProps> = ({ battle, currentPhase, spectatorCount }) => {
  const { label, color } = PHASE_LABELS[currentPhase]

  return (
    <div className="h-14 flex-shrink-0 flex items-center gap-3 px-4 border-b border-greyscale-800 bg-gray-800">
      <Link
        to="/battles"
        className="flex items-center gap-1.5 text-greyscale-400 hover:text-greyscale-0 transition-colors text-sm"
      >
        <ArrowLeft size={15} />
        <span className="hidden sm:inline">Battles</span>
      </Link>
      <div className="h-5 w-px bg-greyscale-800" />
      <h1 className="flex-1 min-w-0 text-sm font-semibold text-greyscale-0 truncate">
        {battle.title}
      </h1>
      <span className={`flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${color}`}>
        {label}
      </span>
      {spectatorCount != null && spectatorCount > 0 && (
        <span className="hidden sm:flex items-center gap-1 text-[11px] text-greyscale-400">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-green animate-pulse" />
          {spectatorCount} watching
        </span>
      )}
    </div>
  )
}
