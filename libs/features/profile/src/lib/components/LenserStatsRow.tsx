
import { LenserStats } from '@lenserfight/types'
import { XPSummary } from '@lenserfight/types'
import { Card } from '@lenserfight/ui/components'
import { formatCount } from '@lenserfight/utils/number'
import { Trophy, MessageSquare, Lightbulb, Hash } from 'lucide-react'
import React, { useEffect, useState } from 'react'

interface LenserStatsRowProps {
  stats: LenserStats | null
  xpSummary?: XPSummary | null
}

const AnimatedCounter: React.FC<{ value: number; prefix?: string }> = ({ value, prefix = '' }) => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const duration = 1200
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsedTime = currentTime - startTime
      const progress = Math.min(elapsedTime / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 4)
      const currentCount = Math.floor(ease * value)
      setCount(currentCount)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setCount(value)
      }
    }

    requestAnimationFrame(animate)
  }, [value])

  return (
    <span>
      {prefix}
      {formatCount(count)}
    </span>
  )
}

export const LenserStatsRow: React.FC<LenserStatsRowProps> = ({ stats, xpSummary }) => {
  const level = xpSummary?.currentLevel || 1
  const totalXP = xpSummary?.totalXp || 0
  const rank = xpSummary?.rank || 0

  // Level Logic: Use dynamic database bounds from xp_levels
  let progressPercent = 0

  if (
    xpSummary &&
    xpSummary.currentLevelMinXp !== undefined &&
    xpSummary.currentLevelMaxXp !== undefined
  ) {
    const xpInCurrentLevel = totalXP - xpSummary.currentLevelMinXp
    const levelSpan = xpSummary.currentLevelMaxXp - xpSummary.currentLevelMinXp

    if (levelSpan > 0) {
      progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / levelSpan) * 100))
    } else {
      progressPercent = 100 // Max level or abnormal state
    }
  } else {
    // Fallback Legacy Logic (Mock formula: XP = Level^2 * 100 - approximate)
    // Used only if DB returns incomplete data
    const currentLevelBaseXP = (level - 1) * (level - 1) * 100
    const nextLevelBaseXP = level * level * 100
    // Adjust if level 1
    const safeCurrent = Math.max(0, currentLevelBaseXP)
    const safeNext = Math.max(100, nextLevelBaseXP)

    const xpProgress = totalXP - safeCurrent
    const xpNeeded = safeNext - safeCurrent
    progressPercent = Math.min(100, Math.max(0, (xpProgress / xpNeeded) * 100))
  }

  const items = [
    {
      label: 'Current Level',
      value: level,
      icon: Trophy,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      progress: progressPercent,
    },
    {
      label: 'Global Rank',
      value: rank,
      prefix: rank > 0 ? '#' : '',
      icon: Hash,
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    },
    {
      label: 'Threads',
      value: stats?.threadsCount ?? 0,
      icon: MessageSquare,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Lenses',
      value: stats?.promptsCount ?? 0,
      icon: Lightbulb,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
      {items.map((item) => (
        <Card
          key={item.label}
          className="p-4 md:p-5 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 h-full min-h-[110px]"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {item.label}
            </span>
            <div className={`p-1.5 rounded-lg ${item.bg} ${item.color}`}>
              <item.icon size={16} />
            </div>
          </div>

          <div className="relative z-10">
            <div
              className={`text-2xl md:text-3xl font-black ${item.color} leading-none tracking-tight`}
            >
              <AnimatedCounter value={item.value} prefix={item.prefix} />
            </div>

            {item.progress !== undefined ? (
              <div
                className="mt-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden"
                title={`Progress: ${Math.round(item.progress)}%`}
              >
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            ) : (
              <div className="h-1.5 mt-3"></div> // Spacer
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}
