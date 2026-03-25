import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { queryKeys } from '@lenserfight/data/cache'
import { battlesService } from '@lenserfight/data/repositories'
import { supabase } from '@lenserfight/data/supabase'
import type { VoteAggregate } from '../types/battle.types'

export const useVoteAggregates = (battleId?: string) => {
  const queryClient = useQueryClient()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const query = useQuery<VoteAggregate[], Error>({
    queryKey: queryKeys.battles.aggregates(battleId ?? ''),
    queryFn: () => battlesService.getVoteAggregates(battleId!),
    enabled: !!battleId,
    // Real-time data must never be considered stale
    staleTime: 0,
  })

  useEffect(() => {
    if (!battleId) return

    const channel = supabase
      .channel(`battle-aggregates-${battleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'battles',
          table: 'vote_aggregates',
          filter: `battle_id=eq.${battleId}`,
        },
        () => {
          // Debounce to collapse rapid vote events into a single refetch
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({
              queryKey: queryKeys.battles.aggregates(battleId),
            })
          }, 300)
        }
      )
      .subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [battleId, queryClient])

  return query
}
