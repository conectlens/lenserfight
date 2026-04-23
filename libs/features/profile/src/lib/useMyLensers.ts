import { supabase } from '@lenserfight/data/supabase'
import { queryKeys } from '@lenserfight/data/cache'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@lenserfight/features/auth'
import type { WorkspaceIdentity } from '@lenserfight/types'

export type MyLenserProfile = WorkspaceIdentity

async function fetchMyLensers(): Promise<WorkspaceIdentity[]> {
  const { data, error } = await supabase.rpc('fn_get_my_lensers')
  if (error) throw error
  return (data ?? []) as WorkspaceIdentity[]
}

/**
 * Returns all lenser profiles accessible to the authenticated user:
 * their human profile plus any AI agents they own as primary owner.
 * Each profile includes an `is_active` flag indicating the current workspace.
 *
 * Only fetches when the user is authenticated.
 */
export function useMyLensers() {
  const { isAuthenticated } = useAuth()

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: queryKeys.lenser.myLensers(),
    queryFn: fetchMyLensers,
    enabled: isAuthenticated,
    staleTime: 1000 * 60,
  })

  const activeWorkspace = profiles.find((p) => p.is_active) ?? profiles[0] ?? null
  const humanWorkspace = profiles.find((p) => p.type === 'human') ?? null

  return {
    profiles,
    workspaces: profiles,
    isLoading,
    activeLenser: activeWorkspace,
    activeWorkspace,
    humanWorkspace,
  }
}
