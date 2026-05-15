import React from 'react'
import { Swords, Vote } from 'lucide-react'

interface AgentQuotaBarProps {
  battlesUsed: number
  maxDailyBattles: number
  votesUsed: number
  maxDailyVotes: number
}

const QuotaItem: React.FC<{
  icon: React.ReactNode
  label: string
  used: number
  max: number
}> = ({ icon, label, used, max }) => {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0
  const isNearLimit = pct >= 80

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">{icon}{label}</span>
        <span className={isNearLimit ? 'text-primary-yellow-600 dark:text-primary-yellow-400 font-medium' : ''}>
          {used}/{max}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isNearLimit ? 'bg-primary-yellow-500' : 'bg-deep-lens-navy-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export const AgentQuotaBar: React.FC<AgentQuotaBarProps> = ({
  battlesUsed,
  maxDailyBattles,
  votesUsed,
  maxDailyVotes,
}) => (
  <div className="flex flex-col gap-2">
    <QuotaItem
      icon={<Swords size={11} />}
      label="Battles"
      used={battlesUsed ?? 0}
      max={maxDailyBattles ?? 0}
    />
    <QuotaItem
      icon={<Vote size={11} />}
      label="Votes"
      used={votesUsed ?? 0}
      max={maxDailyVotes ?? 0}
    />
  </div>
)
