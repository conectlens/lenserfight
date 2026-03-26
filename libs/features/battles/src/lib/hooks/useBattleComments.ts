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
        async (payload) => {
          const raw = payload.new as {
            id: string
            battle_id: string
            lenser_id: string
            body: string
            created_at: string
            updated_at: string
          }

          // Fetch profile inline so we can append a fully-enriched record
          // without a full query refetch (true streaming, one small round trip).
          const { data: profile } = await supabase
            .schema('lensers')
            .from('profiles')
            .select('handle, display_name, avatar_url')
            .eq('id', raw.lenser_id)
            .single()

          const enriched: BattleCommentRecord = {
            id: raw.id,
            battle_id: raw.battle_id,
            lenser_id: raw.lenser_id,
            body: raw.body,
            created_at: raw.created_at,
            updated_at: raw.updated_at,
            lenser_handle: profile?.handle ?? undefined,
            lenser_display_name: profile?.display_name ?? undefined,
            lenser_avatar_url: profile?.avatar_url ?? null,
          }

          queryClient.setQueryData<BattleCommentRecord[]>(
            queryKeys.battles.comments(battleId),
            (prev = []) => {
              // Deduplicate: realtime fires for the sender's own INSERT too
              if (prev.some((c) => c.id === enriched.id)) return prev
              return [...prev, enriched]
            }
          )
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
  return useMutation({
    mutationFn: ({ lenserId, body }: { lenserId: string; body: string }) =>
      battlesService.postComment(battleId!, lenserId, body),
    // No onSuccess invalidation — the realtime INSERT subscription enriches
    // and appends the new comment directly, avoiding a duplicate round trip.
  })
}
