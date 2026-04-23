import { supabase } from '@lenserfight/data/supabase'
import { queryKeys } from '@lenserfight/data/cache'
import { useMutation, useQueryClient } from '@tanstack/react-query'

async function switchActiveLenser(lenserId: string): Promise<void> {
  const { error } = await supabase.rpc('fn_switch_active_lenser', { p_lenser_id: lenserId })
  if (error) throw error
}

/**
 * Switches the active lenser workspace. Validates ownership server-side.
 * On success: invalidates the authenticated lenser + myLensers queries so
 * the sidebar and header re-render with the new active profile context.
 */
export function useSwitchLenser() {
  const queryClient = useQueryClient()

  const { mutateAsync, isPending } = useMutation({
    mutationFn: switchActiveLenser,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.lenser.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.agents.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all }),
      ])
    },
  })

  return { switchLenser: mutateAsync, isSwitching: isPending }
}
