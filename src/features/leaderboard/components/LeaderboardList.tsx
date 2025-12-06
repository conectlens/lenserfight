
import React from 'react';
import { LeaderboardEntry } from '../../../types/xp.types';
import { LeaderboardRow } from './LeaderboardRow';
import { MyPositionStrip } from './MyPositionStrip';
import { Button } from '../../../components/Button';

interface LeaderboardListProps {
  data: LeaderboardEntry[];
  userEntry?: LeaderboardEntry | null;
  isLoading: boolean;
  currentUserId?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isFetchingNextPage?: boolean;
}

export const LeaderboardList: React.FC<LeaderboardListProps> = ({ 
  data, 
  userEntry, 
  isLoading, 
  currentUserId,
  hasMore,
  onLoadMore,
  isFetchingNextPage
}) => {
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
        <div className="py-20 text-center text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium">No lensers found for this period.</p>
        </div>
    );
  }

  // Check if current user is in the visible top list
  const userInTopList = data.some(e => e.lenserId === currentUserId);

  return (
    <div className="relative pb-24 md:pb-0">
      <div className="flex flex-col gap-3">
        {data.map((entry) => (
          <LeaderboardRow 
            key={entry.lenserId} 
            entry={entry} 
            isCurrentUser={entry.lenserId === currentUserId}
          />
        ))}
      </div>

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <Button 
            onClick={onLoadMore} 
            isLoading={isFetchingNextPage}
            variant="secondary"
            className="w-auto px-8"
          >
            Load More
          </Button>
        </div>
      )}

      {/* Sticky footer for user if not in top list */}
      {!userInTopList && userEntry && currentUserId && (
          <MyPositionStrip entry={userEntry} />
      )}
    </div>
  );
};
