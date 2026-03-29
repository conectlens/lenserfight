import { useQuery } from '@tanstack/react-query'
import { lenserService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import type { AuthProfileGate } from '@lenserfight/types'

export const AUTH_PROFILE_GATE_QUERY_KEY = ['lenser', 'auth-profile-gate'] as const

export const useAuthProfileGate = () => {
  const { isAuthenticated } = useAuth()

  return useQuery<AuthProfileGate>({
    queryKey: AUTH_PROFILE_GATE_QUERY_KEY,
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
    queryFn: () => lenserService.getAuthenticatedProfileGate(),
  })
}
