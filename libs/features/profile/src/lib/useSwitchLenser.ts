import { queryKeys } from '@lenserfight/data/cache'
import { agentsService, lenserService } from '@lenserfight/data/repositories'
import { supabase } from '@lenserfight/data/supabase'
import { useAuth } from '@lenserfight/features/auth'
import { useToast } from '@lenserfight/shared/error'
import { useMutation, useQueryClient } from '@tanstack/react-query'


import {
  clearActiveProfileCaches,
  storeActiveWorkspaceId,
  storeWorkspaceSnapshot,
} from './activeProfileCache'

import type { WorkspaceIdentity } from '@lenserfight/types'

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
  const { user } = useAuth()
  const { toastError } = useToast()

  const { mutateAsync, isPending } = useMutation({
    mutationFn: switchActiveLenser,
    onError: (error) => {
      toastError(error, { fallbackMessage: 'Failed to switch workspace. Please try again.' })
    },
    onSuccess: async (_result, targetProfileId) => {
      const profiles =
        queryClient.getQueryData<WorkspaceIdentity[]>(queryKeys.lenser.myLensers()) ?? []

      const updatedProfiles = profiles.map((profile) => ({
        ...profile,
        is_active: profile.id === targetProfileId,
      }))

      if (updatedProfiles.length > 0) {
        queryClient.setQueryData<WorkspaceIdentity[]>(
          queryKeys.lenser.myLensers(),
          updatedProfiles
        )

        // Persist the updated workspace list and active selection to localStorage
        // BEFORE clearing profile caches so reload can bootstrap the sidebar instantly.
        if (user?.id) {
          storeWorkspaceSnapshot(user.id, updatedProfiles)
        }
        storeActiveWorkspaceId(targetProfileId)
      }

      clearActiveProfileCaches()

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.lenser.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.agents.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all }),
      ])

      await queryClient.fetchQuery({
        queryKey: queryKeys.lenser.authenticated(),
        queryFn: () => lenserService.getActiveLenser(),
      })

      const aiProfile = updatedProfiles.find((p) => p.id === targetProfileId && p.type === 'ai')
      if (aiProfile) {
        void queryClient.prefetchQuery({
          queryKey: queryKeys.agents.detailByProfile(targetProfileId),
          queryFn: () => agentsService.getAgentProfileByProfileId(targetProfileId),
          staleTime: 60_000,
        })
      }
    },
  })

  return { switchLenser: mutateAsync, isSwitching: isPending }
}
