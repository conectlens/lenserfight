import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Flame } from 'lucide-react'

import { queryKeys } from '@lenserfight/data/cache'
import { xpService } from '@lenserfight/data/repositories'

interface StreakCardProps {
  lenserId: string
  compact?: boolean
  className?: string
}

const STREAK_MILESTONES = [
  { days: 7, label: '7-Day', icon: '🔆', xp: '+50 XP' },
  { days: 14, label: '14-Day', icon: '🔥', xp: '+80 XP' },
  { days: 30, label: '30-Day', icon: '☀️', xp: '+150 XP' },
]

export const StreakCard: React.FC<StreakCardProps> = ({
  lenserId,
  compact = false,
  className = '',
}) => {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.xp.streak(lenserId),
    queryFn: () => xpService.getStreak(lenserId),
    staleTime: 1000 * 60 * 5,
    enabled: !!lenserId,
  })

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="w-16 h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      </div>
    )
  }

  const current = data?.currentStreak ?? 0
  const best = data?.bestStreak ?? 0

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`} title={`${current} day streak (best: ${best})`}>
        <Flame
          size={14}
          className={current > 0 ? 'text-orange-500 fill-current' : 'text-gray-300 dark:text-gray-600'}
        />
        <span className={`text-sm font-semibold ${current > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
          {current}
        </span>
      </div>
    )
  }

  const nextMilestone = STREAK_MILESTONES.find((m) => m.days > current)

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame
            size={18}
            className={current > 0 ? 'text-orange-500 fill-current' : 'text-gray-300 dark:text-gray-600'}
          />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Daily Streak</span>
        </div>
        <div className="text-right">
          <span
            className={`text-2xl font-black leading-none ${
              current > 0 ? 'text-orange-500' : 'text-gray-300 dark:text-gray-600'
            }`}
          >
            {current}
          </span>
          <span className="text-xs text-gray-400 ml-1">days</span>
        </div>
      </div>

      {/* Milestone progress */}
      {nextMilestone && (
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>
              Next: {nextMilestone.icon} {nextMilestone.label} ({nextMilestone.xp})
            </span>
            <span>
              {current}/{nextMilestone.days}
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-orange-400 h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, (current / nextMilestone.days) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Best streak badge */}
      {best > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Best streak: <span className="font-semibold text-gray-600 dark:text-gray-300">{best} days</span>
        </p>
      )}

      {current === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Log in daily to build your streak and earn bonus XP.
        </p>
      )}
    </div>
  )
}
