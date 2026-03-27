import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Swords } from 'lucide-react'

import { SEOHead } from '@lenserfight/ui/components'
import { useLenser } from '@lenserfight/features/profile'
import { useLeaderboard as useActivityLeaderboard } from '@lenserfight/features/home'
import { LeaderboardTimeframe, LeaderboardScope, FollowPeriod } from '@lenserfight/types'
import { useError, normalizeError } from '@lenserfight/shared/error'
import { FEATURES } from '@lenserfight/utils/env'
import { LenserBoardFilters } from '../components/LenserBoardFilters'
import { LenserBoardHeader } from '../components/LenserBoardHeader'
import { LenserBoardList } from '../components/LenserBoardList'
import { LenserBoardRow } from '../components/LenserBoardRow'
import { LenserBoardTabs } from '../components/LenserBoardTabs'
import { useLenserBoard } from '../useXP'
import { useLenserBoardElo } from '../useLenserBoardElo'

const ACTIVITY_PERIOD_LABELS: Record<FollowPeriod, string> = {
  weekly: 'This Week',
  monthly: 'This Month',
  all_time: 'All Time',
}

export const LenserBoardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { lenser } = useLenser()
  const { setError } = useError()
  const [scope, setScope] = useState<LeaderboardScope>('global')
  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>('all_time')
  const boardParam = searchParams.get('board') as 'xp' | 'activity' | 'elo' | null
  const [board, setBoard] = useState<'xp' | 'activity' | 'elo'>(
    boardParam === 'activity' || boardParam === 'elo' ? boardParam : 'xp'
  )
  const [activityPeriod, setActivityPeriod] = useState<FollowPeriod>('all_time')

  const handleBoardChange = (b: 'xp' | 'activity' | 'elo') => {
    setBoard(b)
    setSearchParams(b === 'xp' ? {} : { board: b })
  }

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, error: xpError } =
    useLenserBoard(timeframe, scope)

  const { data: activityData, isLoading: activityLoading, error: activityError } =
    useActivityLeaderboard(activityPeriod, 20)

  const { data: eloData, isLoading: eloLoading } = useLenserBoardElo(50)

  useEffect(() => {
    const err = xpError ?? activityError
    if (err) setError(normalizeError(err))
  }, [xpError, activityError, setError])

  const lenserBoardList = data?.pages.flatMap((page) => page.list) || []
  const userEntry = data?.pages[0]?.userEntry

  return (
    <div className="">
      <SEOHead type="default" overrideTitle="LenserBoard" />

      <LenserBoardHeader />

      {/* Board type toggle */}
      <div className="flex gap-2 mb-6">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
          {(['xp', 'activity', ...(FEATURES.AGENTS ? ['elo' as const] : [])] as const).map((b) => (
            <button
              key={b}
              onClick={() => handleBoardChange(b)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${board === b
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              {b === 'xp' ? 'XP Ranking' : b === 'activity' ? 'Activity Score' : 'ELO Rating'}
            </button>
          ))}
        </div>
      </div>

      {board === 'xp' ? (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-transparent py-2">
            <LenserBoardTabs activeScope={scope} onChange={setScope} />
            <div className="w-full md:w-auto overflow-x-auto scrollbar-hide pb-1 md:pb-0">
              <LenserBoardFilters activeTimeframe={timeframe} onChange={setTimeframe} />
            </div>
          </div>

          <LenserBoardList
            data={lenserBoardList}
            userEntry={userEntry}
            isLoading={isLoading}
            currentUserId={lenser?.id}
            onLoadMore={fetchNextPage}
            hasMore={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
          />
        </>
      ) : board === 'activity' ? (
        <>
          {/* Activity period filter */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {(Object.keys(ACTIVITY_PERIOD_LABELS) as FollowPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setActivityPeriod(p)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${activityPeriod === p
                  ? 'bg-primary text-black '
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
                <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !activityData?.length ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">
              No activity data for this period.
            </div>
          ) : (
            <div className="space-y-2">
              {activityData.map((entry) => (
                <LenserBoardRow mode="activity" key={entry.lenserId} entry={entry} />
              ))}
            </div>
          )}
        </>
      ) : board === 'elo' && FEATURES.AGENTS ? (
        <>
          {eloLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !eloData?.length ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">
              <Swords className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">No ELO rankings yet.</p>
              <p className="text-sm mt-1">Rankings appear after battles are played.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {eloData.map((entry) => (
                <LenserBoardRow mode="elo" key={entry.lenser_id} entry={entry} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
