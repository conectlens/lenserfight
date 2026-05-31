import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  mobileContentService,
  type SubmitVoteInput,
} from '../services/mobileContentService'

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

export function useBattlesFeed(status?: string) {
  return useQuery({
    queryKey: ['mobile', 'battles-feed', status ?? 'all'],
    queryFn: () => mobileContentService.getBattlesFeed(status, 20),
  })
}

export function useCreateBattle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      title,
      taskPrompt,
      battleType,
      rules,
    }: {
      title: string
      taskPrompt: string
      battleType: 'ai_vs_ai' | 'human_vs_human_open_votes' | 'human_vs_ai'
      rules?: string
    }) => mobileContentService.createBattle(title, taskPrompt, battleType, rules),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile', 'battles-feed'] })
      queryClient.invalidateQueries({ queryKey: ['mobile', 'battles'] })
    },
  })
}

export function useBattleDetail(id: string) {
  return useQuery({
    queryKey: ['mobile', 'battle', id],
    queryFn: () => mobileContentService.getBattle(id),
    enabled: !!id,
  })
}

export function useBattleResult(id: string) {
  return useQuery({
    queryKey: ['mobile', 'battle-result', id],
    queryFn: () => mobileContentService.getBattleResult(id),
    enabled: !!id,
  })
}

export function useMyBattleVote(id?: string) {
  return useQuery({
    queryKey: ['mobile', 'battle-vote', id],
    queryFn: () => mobileContentService.getMyBattleVote(id!),
    enabled: !!id,
  })
}

export function useBattleVoteEligibility(battleId?: string, lenserId?: string) {
  return useQuery({
    queryKey: ['mobile', 'battle-eligibility', battleId, lenserId],
    queryFn: () => mobileContentService.checkBattleVoteEligibility(battleId!, lenserId!),
    enabled: !!battleId && !!lenserId,
    staleTime: 1000 * 60,
  })
}

export function useSubmitBattleVote(battleId?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SubmitVoteInput) => mobileContentService.submitBattleVote(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile', 'battle-result', battleId] })
      queryClient.invalidateQueries({ queryKey: ['mobile', 'battle-vote', battleId] })
      queryClient.invalidateQueries({ queryKey: ['mobile', 'battle', battleId] })
    },
  })
}

export function useLenserLenses(handle?: string | null, viewerId?: string) {
  return useQuery({
    queryKey: ['mobile', 'lenser-lenses', handle, viewerId ?? 'anonymous'],
    queryFn: () => mobileContentService.getLenserLenses(handle!, viewerId),
    enabled: !!handle,
  })
}

export function useLenserThreads(handle?: string | null, viewerId?: string) {
  return useQuery({
    queryKey: ['mobile', 'lenser-threads', handle, viewerId ?? 'anonymous'],
    queryFn: () => mobileContentService.getLenserThreads(handle!, viewerId),
    enabled: !!handle,
  })
}
