import { queryKeys } from '@lenserfight/data/cache'
import { battlesService } from '@lenserfight/data/repositories'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

/**
 * Detects the race where the worker (or another finalizer) closed the battle
 * between render and click. fn_battles_finalize then RAISES because the battle
 * is no longer in voting/scoring; fn_mcp_battle_finalize can surface an
 * access/already-closed error. Both mean "already finalized" to the user.
 */
const isAlreadyFinalized = (message: string): boolean =>
  /voting or scoring status to finalize|current: (closed|published|archived)|access_denied/i.test(
    message,
  )

/**
 * Finalize a battle that is in 'scoring' (scoring -> closed). Delegates to
 * battlesService.finalizeBattle -> public.fn_mcp_battle_finalize, which computes
 * the authoritative winner (votes or AI-judge verdicts, mode-aware) on the DB.
 * No domain logic here — this is a thin mutation that invalidates on success.
 */
export const useFinalizeBattle = (battleSlug: string) => {
  const queryClient = useQueryClient()
  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.battles.detail(battleSlug) })
    queryClient.invalidateQueries({ queryKey: queryKeys.battles.all })
  }
  return useMutation<void, Error, string>({
    mutationFn: (battleId: string) => battlesService.finalizeBattle(battleId),
    onSuccess: refetch,
    onError: (error) => {
      const message = error.message ?? ''
      if (isAlreadyFinalized(message)) {
        toast.info('This battle has already been finalized.')
        // Refresh so the UI drops the finalize action and shows the result.
        refetch()
        return
      }
      toast.error(message || 'Failed to finalize battle. Please try again.')
    },
  })
}
