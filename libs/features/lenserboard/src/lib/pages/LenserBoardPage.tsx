import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Swords, Trophy } from 'lucide-react'

import { PageMeta } from '@lenserfight/ui/layout'
import { useLenser } from '@lenserfight/features/profile'
import { useLeaderboard as useActivityLeaderboard } from '@lenserfight/features/home'
import { LeaderboardTimeframe, LeaderboardScope, FollowPeriod } from '@lenserfight/types'
import { useError, normalizeError } from '@lenserfight/shared/error'
import { LenserBoardFilters } from '../components/LenserBoardFilters'
import { LenserBoardHeader } from '../components/LenserBoardHeader'
import { LenserBoardList } from '../components/LenserBoardList'
import { LenserBoardRow } from '../components/LenserBoardRow'
import { LenserBoardTabs } from '../components/LenserBoardTabs'
import { SeasonLeaderboardPanel } from '../components/SeasonLeaderboardPanel'
import { useLenserBoard } from '../useXP'
import { useLenserBoardElo } from '../useLenserBoardElo'

const ACTIVITY_PERIOD_LABELS: Record<FollowPeriod, string> = {
  weekly: 'This Week',
  monthly: 'This Month',
  all_time: 'All Time',
}

type BoardType = 'xp' | 'season' | 'activity' | 'elo'

export const LenserBoardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { lenser } = useLenser()
  const { setError } = useError()
  const [scope, setScope] = useState<LeaderboardScope>('global')
  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>('all_time')
  const boardParam = searchParams.get('board') as BoardType | null
  const [board, setBoard] = useState<BoardType>(
    boardParam === 'activity' || boardParam === 'elo' || boardParam === 'season'
      ? boardParam
      : 'xp'
  )
  const [activityPeriod, setActivityPeriod] = useState<FollowPeriod>('all_time')

  const handleBoardChange = (b: BoardType) => {
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

  const boardTabs: { key: BoardType; label: string }[] = [
    { key: 'xp', label: 'XP Ranking' },
    { key: 'season', label: 'Season' },
    { key: 'activity', label: 'Activity Score' },
    { key: 'elo' as BoardType, label: 'ELO Rating' },
  ]

  return (
    <div className="">
      <PageMeta
        title="Leaderboard · LenserFight"
        description="Top AI and human lensers ranked by XP, ELO, and battle performance."
      />

      <LenserBoardHeader />


      {/* Board type toggle */}
      <div className="sticky top-[56px] z-20 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur py-3 border-b border-gray-100/50 dark:border-gray-800/50 transition-all mb-2 -mx-2 sm:-mx-4 lg:-mx-8 px-2 sm:px-4 lg:px-8">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1 w-fit overflow-x-auto">
          {boardTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleBoardChange(key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${board === key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {board === 'xp' ? (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-3 bg-transparent py-2">
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
      ) : board === 'season' ? (
        <SeasonLeaderboardPanel />
      ) : board === 'activity' ? (
        <>
          {/* Activity period filter */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {(Object.keys(ACTIVITY_PERIOD_LABELS) as FollowPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setActivityPeriod(p)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${activityPeriod === p
                  ? 'bg-primary text-black'
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
      ) : board === 'elo' ? (
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
