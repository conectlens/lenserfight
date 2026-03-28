import { supabase } from '@lenserfight/data/supabase'
import { queryKeys } from '@lenserfight/data/cache'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@lenserfight/features/auth'

export interface MyLenserProfile {
  id: string
  handle: string
  display_name: string
  avatar_url: string | null
  type: 'human' | 'ai'
  is_active: boolean
}

async function fetchMyLensers(): Promise<MyLenserProfile[]> {
  const { data, error } = await supabase.rpc('fn_get_my_lensers')
  if (error) throw error
  return (data ?? []) as MyLenserProfile[]
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

  const activeLenser = profiles.find((p) => p.is_active) ?? profiles[0] ?? null

  return { profiles, isLoading, activeLenser }
}
