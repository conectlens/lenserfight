import { useQuery } from '@tanstack/react-query'

import { mobileContentService } from '../services/mobileContentService'

export function useThreadList() {
  return useQuery({
    queryKey: ['mobile', 'threads'],
    queryFn: () => mobileContentService.listThreads(),
  })
}

export function useThreadDetail(id: string, viewerLenserId?: string) {
  return useQuery({
    queryKey: ['mobile', 'thread', id, viewerLenserId ?? 'anonymous'],
    queryFn: () => mobileContentService.getThread(id, viewerLenserId),
    enabled: !!id,
  })
}

export function useLensList() {
  return useQuery({
    queryKey: ['mobile', 'lenses'],
    queryFn: () => mobileContentService.listLenses(),
  })
}

export function useLensDetail(id: string, viewerLenserId?: string) {
  return useQuery({
    queryKey: ['mobile', 'lens', id, viewerLenserId ?? 'anonymous'],
    queryFn: () => mobileContentService.getLens(id, viewerLenserId),
    enabled: !!id,
  })
}

export function useTagList() {
  return useQuery({
    queryKey: ['mobile', 'tags'],
    queryFn: () => mobileContentService.listTags(),
  })
}

export function useTagDetail(slug: string) {
  return useQuery({
    queryKey: ['mobile', 'tag', slug],
    queryFn: () => mobileContentService.getTag(slug),
    enabled: !!slug,
  })
}

export function useProfile() {
  return useQuery({
    queryKey: ['mobile', 'profile'],
    queryFn: () => mobileContentService.getProfile(),
  })
}

export function useBattleList() {
  return useQuery({
    queryKey: ['mobile', 'battles'],
    queryFn: () => mobileContentService.listBattles(),
  })
}

export function useBattleDetail(id: string) {
  return useQuery({
    queryKey: ['mobile', 'battle', id],
    queryFn: () => mobileContentService.getBattle(id),
    enabled: !!id,
  })
}
