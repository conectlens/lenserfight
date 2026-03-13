import React, { useState } from 'react'

import { SEOHead } from '@lenserfight/ui/components'
import { useLenser } from '@lenserfight/features/profile'
import { useLeaderboard } from '@lenserfight/features/leaderboard'
import { LeaderboardTimeframe, LeaderboardScope } from '@lenserfight/types'
import { LeaderboardFilters } from '../components/LeaderboardFilters'
import { LeaderboardHeader } from '../components/LeaderboardHeader'
import { LeaderboardList } from '../components/LeaderboardList'
import { LeaderboardTabs } from '../components/LeaderboardTabs'

export const LeaderboardPage: React.FC = () => {
  const { lenser } = useLenser()
  const [scope, setScope] = useState<LeaderboardScope>('global')
  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>('all_time')

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useLeaderboard(
    timeframe,
    scope
  )

  const leaderboardList = data?.pages.flatMap((page) => page.list) || []
  // Use the userEntry from the first page, as it should be consistent across pages for the current user's stats
  const userEntry = data?.pages[0]?.userEntry

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 md:px-6">
      <SEOHead type="default" overrideTitle="Leaderboard" />

      <LeaderboardHeader />

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
    </div>
  )
}
