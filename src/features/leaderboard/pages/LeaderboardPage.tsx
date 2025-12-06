
import React, { useState } from 'react';
import { LeaderboardHeader } from '../components/LeaderboardHeader';
import { LeaderboardTabs } from '../components/LeaderboardTabs';
import { LeaderboardFilters } from '../components/LeaderboardFilters';
import { LeaderboardList } from '../components/LeaderboardList';
import { useLeaderboard } from '../../../hooks/useXP';
import { LeaderboardTimeframe, LeaderboardScope } from '../../../types/xp.types';
import { SEOHead } from '../../../components/SEOHead';
import { useLenser } from '../../../context/LenserContext';

export const LeaderboardPage: React.FC = () => {
  const { lenser } = useLenser();
  const [scope, setScope] = useState<LeaderboardScope>('global');
  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>('all_time');

  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useLeaderboard(timeframe, scope);

  const leaderboardList = data?.pages.flatMap(page => page.list) || [];
  // Use the userEntry from the first page, as it should be consistent across pages for the current user's stats
  const userEntry = data?.pages[0]?.userEntry;

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
  );
};
