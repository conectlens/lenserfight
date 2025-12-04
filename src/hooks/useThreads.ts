
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { threadsService } from '../services/threadsService';
import { promptsService } from '../services/promptsService';
import { lenserService } from '../services/lenserService';

// Keys Factory
export const keys = {
  threads: {
    all: ['threads'] as const,
    feed: () => [...keys.threads.all, 'feed'] as const,
    detail: (id: string) => [...keys.threads.all, 'detail', id] as const,
  },
  prompts: {
    top: ['prompts', 'top'] as const,
  },
  lensers: {
    latest: ['lensers', 'latest'] as const,
  },
  tags: {
    trending: ['tags', 'trending'] as const,
  }
};

export const useThreadsFeed = () => {
  return useInfiniteQuery({
    queryKey: keys.threads.feed(),
    queryFn: async ({ pageParam = 0 }) => {
      return threadsService.getThreadsFeed(undefined, pageParam * 10, 10);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 10 ? allPages.length : undefined;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

export const useTopPrompts = () => {
  return useQuery({
    queryKey: keys.prompts.top,
    queryFn: () => promptsService.getTopPrompts(3),
    staleTime: 1000 * 60 * 10, // 10 minutes (rarely changes)
  });
};

export const useTrendingTags = () => {
  return useQuery({
    queryKey: keys.tags.trending,
    queryFn: () => threadsService.getTrendingTags(6),
    staleTime: 1000 * 60 * 15,
  });
};

export const useLatestLensers = () => {
  return useQuery({
    queryKey: keys.lensers.latest,
    queryFn: () => lenserService.getLatestJoinedLensers(4),
    staleTime: 1000 * 60 * 5,
  });
};
