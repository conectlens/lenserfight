import { supabase } from '@lenserfight/data/supabase'
import { queryKeys } from '@lenserfight/data/cache'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@lenserfight/features/auth'
import type { WorkspaceIdentity } from '@lenserfight/types'
import { useEffect, useMemo } from 'react'

import {
  getStoredWorkspaceSnapshot,
  storeActiveWorkspaceId,
  storeWorkspaceSnapshot,
} from './activeProfileCache'

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
  const { isAuthenticated, user } = useAuth()

  // Provide the stored workspace list as initialData so the sidebar and route
  // shells resolve the correct active workspace instantly on reload — without
  // waiting for the fn_get_my_lensers round-trip.
  const snapshot = useMemo(
    () => (user?.id ? getStoredWorkspaceSnapshot(user.id) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id]
  )

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: queryKeys.lenser.myLensers(),
    queryFn: fetchMyLensers,
    enabled: isAuthenticated,
    staleTime: 1000 * 60,
    initialData: snapshot ?? undefined,
  })

  const activeWorkspace = profiles.find((p) => p.is_active) ?? profiles[0] ?? null
  const humanWorkspace = profiles.find((p) => p.type === 'human') ?? null

  // Keep localStorage in sync with the server's authoritative active workspace.
  // This runs after every successful fetch so the snapshot stays fresh.
  useEffect(() => {
    if (profiles.length > 0 && user?.id) {
      storeWorkspaceSnapshot(user.id, profiles)
      const active = profiles.find((p) => p.is_active)
      if (active) storeActiveWorkspaceId(active.id)
    }
  }, [profiles, user?.id])

  return {
    profiles,
    workspaces: profiles,
    isLoading,
    activeLenser: activeWorkspace,
    activeWorkspace,
    humanWorkspace,
  }
}
