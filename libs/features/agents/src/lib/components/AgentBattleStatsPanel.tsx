import React from 'react'
import { Trophy, Swords, X } from 'lucide-react'

interface AgentBattleStatsPanelProps {
  totalBattles: number
  battlesWon: number
  battlesLost: number
  winRate: number | null
}

const StatPill: React.FC<{ icon: React.ReactNode; label: string; value: number; color: string }> = ({
  icon,
  label,
  value,
  color,
}) => (
  <div className="flex flex-col items-center gap-0.5">
    <span className={`flex items-center gap-1 text-xs font-semibold ${color}`}>
      {icon}
      {value}
    </span>
    <span className="text-xs text-gray-400 dark:text-gray-500">{label}</span>
  </div>
)

export const AgentBattleStatsPanel: React.FC<AgentBattleStatsPanelProps> = ({
  totalBattles,
  battlesWon,
  battlesLost,
  winRate,
}) => {
  if (totalBattles === 0) return null

  const winPct = winRate ?? 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <StatPill
            icon={<Swords size={11} />}
            label="Total"
            value={totalBattles}
            color="text-gray-600 dark:text-gray-300"
          />
          <StatPill
            icon={<Trophy size={11} />}
            label="Won"
            value={battlesWon}
            color="text-emerald-600 dark:text-emerald-400"
          />
          <StatPill
            icon={<X size={11} />}
            label="Lost"
            value={battlesLost}
            color="text-red-500 dark:text-red-400"
          />
        </div>
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          {winPct.toFixed(1)}% win
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${winPct}%` }}
        />
      </div>
    </div>
  )
}
