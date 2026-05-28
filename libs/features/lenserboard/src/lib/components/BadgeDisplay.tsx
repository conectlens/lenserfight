import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Award } from 'lucide-react'
import { timeAgo } from '@lenserfight/utils/date'

import { queryKeys } from '@lenserfight/data/cache'
import { xpService } from '@lenserfight/data/repositories'
import { LenserBadge } from '@lenserfight/types'

interface BadgeDisplayProps {
  lenserId: string
  /** If true, shows all badges with dates; otherwise shows icon grid */
  detailed?: boolean
  className?: string
}

const BadgePill: React.FC<{ badge: LenserBadge; showDate?: boolean }> = ({ badge, showDate }) => (
  <div
    title={badge.description ?? badge.label}
    className="group relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary/40 transition-colors cursor-default"
  >
    {badge.icon && <span className="text-base leading-none">{badge.icon}</span>}
    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{badge.label}</span>
    {showDate && (
      <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">
        · {timeAgo(badge.awardedAt)}
      </span>
    )}

    {/* Tooltip for description */}
    {badge.description && (
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md bg-gray-900 dark:bg-gray-700 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-lg">
        {badge.description}
      </div>
    )}
  </div>
)

const BadgeIconGrid: React.FC<{ badges: LenserBadge[]; className?: string }> = ({
  badges,
  className = '',
}) => (
  <div className={`flex flex-wrap gap-1.5 ${className}`}>
    {badges.map((badge) => (
      <div
        key={badge.id}
        title={`${badge.label}${badge.description ? ` — ${badge.description}` : ''}`}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform cursor-default text-base"
      >
        {badge.icon ?? '🏅'}
      </div>
    ))}
  </div>
)

export const BadgeDisplay: React.FC<BadgeDisplayProps> = ({
  lenserId,
  detailed = false,
  className = '',
}) => {
  const [showAll, setShowAll] = useState(false)
  const PREVIEW_COUNT = 6

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.xp.badges(lenserId),
    queryFn: () => xpService.getBadges(lenserId),
    staleTime: 1000 * 60 * 5,
    enabled: !!lenserId,
  })

  if (isLoading) {
    return (
      <div className={`flex gap-2 ${className}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!data?.length) {
    return (
      <div className={`flex items-center gap-2 text-gray-400 dark:text-gray-600 ${className}`}>
        <Award size={16} />
        <span className="text-xs">No badges yet — keep earning XP!</span>
      </div>
    )
  }

  if (detailed) {
    const visible = showAll ? data : data.slice(0, PREVIEW_COUNT)
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center gap-2 mb-1">
          <Award size={15} className="text-yellow-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Badges <span className="text-xs font-normal text-gray-400">({data.length})</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {visible.map((badge) => (
            <BadgePill key={badge.id} badge={badge} showDate />
          ))}
        </div>
        {data.length > PREVIEW_COUNT && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-xs text-primary hover:underline mt-1"
          >
            {showAll ? 'Show less' : `Show ${data.length - PREVIEW_COUNT} more`}
          </button>
        )}
      </div>
    )
  }

  return <BadgeIconGrid badges={data} className={className} />
}
