import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { SEOHead } from '@lenserfight/ui/components'
import { Avatar } from '@lenserfight/ui/components'
import { useLenser } from '@lenserfight/features/profile'
import { useLeaderboard } from '@lenserfight/features/leaderboard'
import { useLeaderboard as useActivityLeaderboard } from '@lenserfight/features/home'
import { LeaderboardTimeframe, LeaderboardScope, FollowPeriod } from '@lenserfight/types'
import { useError, normalizeError } from '@lenserfight/shared/error'
import { LeaderboardFilters } from '../components/LeaderboardFilters'
import { LeaderboardHeader } from '../components/LeaderboardHeader'
import { LeaderboardList } from '../components/LeaderboardList'
import { LeaderboardTabs } from '../components/LeaderboardTabs'

const ACTIVITY_PERIOD_LABELS: Record<FollowPeriod, string> = {
  weekly: 'This Week',
  monthly: 'This Month',
  all_time: 'All Time',
}

export const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { lenser } = useLenser()
  const { setError } = useError()
  const [scope, setScope] = useState<LeaderboardScope>('global')
  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>('all_time')
  const [board, setBoard] = useState<'xp' | 'activity'>('xp')
  const [activityPeriod, setActivityPeriod] = useState<FollowPeriod>('all_time')

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, error: xpError } =
    useLeaderboard(timeframe, scope)

  const { data: activityData, isLoading: activityLoading, error: activityError } =
    useActivityLeaderboard(activityPeriod, 20)

  useEffect(() => {
    const err = xpError ?? activityError
    if (err) setError(normalizeError(err))
  }, [xpError, activityError, setError])

  const leaderboardList = data?.pages.flatMap((page) => page.list) || []
  const userEntry = data?.pages[0]?.userEntry

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 md:px-6">
      <SEOHead type="default" overrideTitle="Leaderboard" />

      <LeaderboardHeader />

      {/* Board type toggle */}
      <div className="flex gap-2 mb-6">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
          {(['xp', 'activity'] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBoard(b)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                board === b
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {b === 'xp' ? 'XP Ranking' : 'Activity Score'}
            </button>
          ))}
        </div>
      </div>

      {board === 'xp' ? (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-transparent py-2">
            <LeaderboardTabs activeScope={scope} onChange={setScope} />
            <div className="w-full md:w-auto overflow-x-auto scrollbar-hide pb-1 md:pb-0">
              <LeaderboardFilters activeTimeframe={timeframe} onChange={setTimeframe} />
            </div>
          </div>

          <LeaderboardList
            data={leaderboardList}
            userEntry={userEntry}
            isLoading={isLoading}
            currentUserId={lenser?.id}
            onLoadMore={fetchNextPage}
            hasMore={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
          />
        </>
      ) : (
        <>
          {/* Activity period filter */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {(Object.keys(ACTIVITY_PERIOD_LABELS) as FollowPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setActivityPeriod(p)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  activityPeriod === p
                    ? 'bg-primary text-black dark:text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-black dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {ACTIVITY_PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {activityLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : !activityData?.length ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">
              No activity data for this period.
            </div>
          ) : (
            <div className="space-y-2">
              {activityData.map((entry) => (
                <div
                  key={entry.lenserId}
                  onClick={() => navigate(`/lenser/${entry.handle}`)}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  <span className="w-7 text-center text-sm font-bold text-gray-500 dark:text-gray-400">
                    {entry.rank}
                  </span>
                  <Avatar
                    src={entry.avatarUrl}
                    alt={entry.displayName}
                    size="md"
                    className="!w-9 !h-9 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {entry.displayName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">@{entry.handle}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {entry.totalXp.toLocaleString()} XP
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Score {entry.lenserScore.toFixed(1)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
