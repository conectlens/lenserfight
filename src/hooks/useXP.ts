
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { xpService } from '../services/xpService';
import { useLenser } from '../context/LenserContext';

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

  // Mutation for manual awards (rarely used directly by UI, usually triggered by other mutations)
  const awardMutation = useMutation({
    mutationFn: (variables: { action: any, ref?: any }) => {
        if (!userId) throw new Error("No user");
        return xpService.award(userId, variables.action, variables.ref);
    },
    onSuccess: (newStats) => {
        // Optimistic update or invalidation
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

export const useLeaderboard = () => {
  return useQuery({
    queryKey: ['xp', 'leaderboard', 'global'],
    queryFn: () => xpService.getLeaderboard(),
    staleTime: 1000 * 60 * 15 // 15 mins
  });
};
