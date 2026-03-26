import { queryKeys } from '@lenserfight/data/cache'
import { battlesService } from '@lenserfight/data/repositories'
import type { BattleCommentRecord } from '@lenserfight/data/repositories'
import { supabase } from '@lenserfight/data/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

export const useBattleComments = (battleId?: string) => {
  const queryClient = useQueryClient()

  const query = useQuery<BattleCommentRecord[], Error>({
    queryKey: queryKeys.battles.comments(battleId ?? ''),
    queryFn: () => battlesService.getBattleComments(battleId!),
    enabled: !!battleId,
    staleTime: 0,
  })

  // Real-time subscription — append new comments without full refetch
  useEffect(() => {
    if (!battleId) return

    const channel = supabase
      .channel(`battle-comments-${battleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'battles',
          table: 'comments',
          filter: `battle_id=eq.${battleId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.battles.comments(battleId),
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [battleId, queryClient])

  return query
}

export const usePostComment = (battleId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ lenserId, body }: { lenserId: string; body: string }) =>
      battlesService.postComment(battleId!, lenserId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.battles.comments(battleId ?? ''),
      })
    },
  })
}
