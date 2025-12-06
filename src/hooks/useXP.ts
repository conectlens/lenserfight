
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { xpService } from '../services/xpService';
import { useLenser } from '../context/LenserContext';
import { LeaderboardTimeframe, LeaderboardScope } from '../types/xp.types';

export const useXP = () => {
  const { lenser } = useLenser();
  const queryClient = useQueryClient();
  const userId = lenser?.id;

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['xp', 'stats', userId],
    queryFn: () => userId ? xpService.getStats(userId) : null,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5 // 5 mins
  });

  const { data: badges, isLoading: loadingBadges } = useQuery({
    queryKey: ['xp', 'badges', userId],
    queryFn: () => userId ? xpService.getBadges(userId) : [],
    enabled: !!userId,
    staleTime: 1000 * 60 * 30 // 30 mins
  });

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['xp', 'history', userId],
    queryFn: () => userId ? xpService.getHistory(userId) : [],
    enabled: !!userId,
  });

  const awardMutation = useMutation({
    mutationFn: (variables: { action: any, ref?: any }) => {
        if (!userId) throw new Error("No user");
        return xpService.award(userId, variables.action, variables.ref);
    },
    onSuccess: (newStats) => {
        queryClient.setQueryData(['xp', 'stats', userId], (old: any) => ({ ...old, ...newStats }));
        queryClient.invalidateQueries({ queryKey: ['xp', 'history', userId] });
    }
  });

  return {
    stats,
    badges,
    history,
    loadingStats,
    loadingBadges,
    loadingHistory,
    awardXP: awardMutation.mutate
  };
};

export const useLeaderboard = (timeframe: LeaderboardTimeframe, scope: LeaderboardScope) => {
  const pageSize = 20;
  return useInfiniteQuery({
    queryKey: ['xp', 'leaderboard', timeframe, scope],
    queryFn: ({ pageParam = 0 }) => xpService.getLeaderboard(timeframe, scope, pageSize, pageParam * pageSize),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
        if (lastPage.list.length < pageSize) return undefined;
        return allPages.length;
    },
    staleTime: 1000 * 60 * 15 // 15 mins
  });
};
