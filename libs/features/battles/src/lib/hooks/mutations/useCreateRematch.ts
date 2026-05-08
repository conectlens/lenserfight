import { queryKeys } from '@lenserfight/data/cache'
import { supabase } from '@lenserfight/data/supabase'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Phase V1 — Rematch creation hook.
//
// Wraps `public.fn_battles_create_rematch(p_parent_id)` which clones the
// parent battle into a fresh `draft` battle the caller owns. The RPC returns
// only the new battle's `uuid`; we follow up with a slug lookup so the caller
// can navigate to the standard `/battles/:slug` route without needing the
// RPC contract to expand.
//
// Contract:
//   * `mutateAsync(parentBattleId)` resolves to `{ id, slug }`.
//   * On error, a sonner toast is fired (mirrors useSubmitVote pattern).
//   * The battles list query is invalidated on success so the new draft
//     becomes visible in the creator's feed.
export interface CreateRematchResult {
  id: string
  slug: string
}

export const useCreateRematch = () => {
  const queryClient = useQueryClient()

  return useMutation<CreateRematchResult, Error, string>({
    mutationFn: async (parentBattleId: string) => {
      const { data: newId, error } = await supabase.rpc('fn_battles_create_rematch', {
        p_parent_id: parentBattleId,
      })

      if (error) throw new Error(error.message ?? 'Failed to create rematch')
      if (!newId || typeof newId !== 'string') {
        throw new Error('Rematch RPC returned no battle id')
      }

      const { data: battleRow, error: lookupError } = await supabase
        .schema('battles')
        .from('battles')
        .select('slug')
        .eq('id', newId)
        .single()

      if (lookupError) throw new Error(lookupError.message ?? 'Failed to resolve new battle slug')
      if (!battleRow?.slug) throw new Error('New battle has no slug')

      return { id: newId, slug: battleRow.slug as string }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.battles.all })
    },
    onError: (error) => {
      toast.error(error.message ?? 'Failed to create rematch. Please try again.')
    },
  })
}
