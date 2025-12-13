
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { threadsService } from '../services/threadsService';
import { promptsService } from '../services/promptsService';
import { lenserService } from '../services/lenserService';
import { useLenser } from '../context/LenserContext';

// Keys Factory
export const keys = {
  threads: {
    all: ['threads'] as const,
    feed: () => [...keys.threads.all, 'feed'] as const,
    detail: (id: string) => [...keys.threads.all, 'detail', id] as const,
  },
  prompts: {
    all: ['prompts'] as const,
    feed: (filter?: any) => [...keys.prompts.all, 'feed', filter] as const,
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
  const { lenser } = useLenser();
  return useInfiniteQuery({
    queryKey: keys.threads.feed(),
    queryFn: async ({ pageParam = 0 }) => {
      return threadsService.getThreadsFeed(lenser?.id, pageParam * 10, 10);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 10 ? allPages.length : undefined;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,   // 30 minutes
  });
};

export const usePromptsFeed = (
  searchQuery: string, 
  selectedTag: string | null, 
  sortOrder: 'newest' | 'popular'
) => {
  return useInfiniteQuery({
    queryKey: keys.prompts.feed({ searchQuery, selectedTag, sortOrder }),
    queryFn: async ({ pageParam = 0 }) => {
      const offset = pageParam * 12;
      const limit = 12;
      
      if (searchQuery) return promptsService.search(searchQuery, offset, limit);
      if (selectedTag) return promptsService.filter(selectedTag, offset, limit);
      if (sortOrder) return promptsService.sort(sortOrder, offset, limit);
      
      return promptsService.getPrompts(offset, limit);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 12 ? allPages.length : undefined;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
};

export const useTopPrompts = () => {
  return useQuery({
    queryKey: keys.prompts.top,
    queryFn: () => promptsService.getTopPrompts(3),
    staleTime: 1000 * 60 * 10,
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
    queryFn: () => lenserService.getLatestJoinedLensers(),
    staleTime: 1000 * 60 * 5,
  });
};
