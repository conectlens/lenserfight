import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@lenserfight/data/supabase'
import { queryKeys } from '@lenserfight/data/cache'

/**
 * Subscribes to real-time UPDATE events on battles.battles for a given battleId.
 * On any update, invalidates the battle detail query so UI reflects the latest phase/status.
 */
export const useBattleStateSync = (battleId?: string, slug?: string) => {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!battleId || !slug) return

    const channel = supabase
      .channel(`battle-state-${battleId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'battles',
          table: 'battles',
          filter: `id=eq.${battleId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.battles.detail(slug) })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [battleId, slug, queryClient])
}
