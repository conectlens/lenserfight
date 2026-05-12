import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Zap, Clock, HelpCircle } from 'lucide-react'
import { timeAgo } from '@lenserfight/utils/date'

import { queryKeys } from '@lenserfight/data/cache'
import { xpService } from '@lenserfight/data/repositories'
import { XPEvent } from '@lenserfight/types'

interface XPHistoryPanelProps {
  lenserId: string
  limit?: number
  className?: string
}

const XP_SOURCE_COLORS: Record<string, string> = {
  battle: 'text-orange-500',
  content: 'text-blue-500',
  social: 'text-pink-500',
  daily: 'text-green-500',
  challenge: 'text-purple-500',
  contribution: 'text-yellow-600',
  system: 'text-gray-400',
  ai: 'text-indigo-500',
  referral: 'text-teal-500',
}

const XPEventRow: React.FC<{ event: XPEvent }> = ({ event }) => {
  const colorCls = XP_SOURCE_COLORS[event.source] ?? 'text-gray-500'
  const isFrozen = event.frozen

  return (
    <div
      className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
        isFrozen ? 'opacity-40' : ''
      }`}
      title={isFrozen ? 'XP frozen — content was moderated' : undefined}
    >
      {/* XP amount */}
      <div
        className={`w-14 text-right font-bold text-sm flex-shrink-0 ${
          isFrozen ? 'line-through text-gray-400' : 'text-emerald-600 dark:text-emerald-400'
        }`}
      >
        +{event.xp}
      </div>

      {/* Action label */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isFrozen ? 'text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
          {event.label ?? event.action}
        </p>
        <p className={`text-xs ${colorCls} capitalize`}>{event.source}</p>
      </div>

      {/* Frozen icon */}
      {isFrozen && (
        <span title="XP frozen due to content moderation">
          <HelpCircle size={14} className="text-gray-400 flex-shrink-0" />
        </span>
      )}

      {/* Timestamp */}
      <p className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 hidden sm:block">
        {timeAgo(event.createdAt)}
      </p>
    </div>
  )
}

const SkeletonRow: React.FC = () => (
  <div className="flex items-center gap-3 py-2.5 px-3">
    <div className="w-14 h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
    <div className="flex-1 space-y-1">
      <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      <div className="h-3 w-1/3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
    </div>
    <div className="w-16 h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse hidden sm:block" />
  </div>
)

export const XPHistoryPanel: React.FC<XPHistoryPanelProps> = ({
  lenserId,
  limit = 15,
  className = '',
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.xp.history(lenserId),
    queryFn: () => xpService.getHistory(lenserId, limit),
    staleTime: 1000 * 60,
    enabled: !!lenserId,
  })

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Clock size={15} className="text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent XP</h3>
      </div>

      {isLoading ? (
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : error ? (
        <p className="text-xs text-gray-400 py-4 text-center">Could not load XP history.</p>
      ) : !data?.length ? (
        <div className="text-center py-8">
          <Zap className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No XP earned yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Post threads, publish lenses, or join a battle to start earning.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
          {data.map((event) => (
            <XPEventRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
