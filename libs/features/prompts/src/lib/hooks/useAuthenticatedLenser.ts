import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@lenserfight/data/cache'
import { lenserService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { Lenser } from '@lenserfight/types'

export const useAuthenticatedLenser = () => {
  const { isAuthenticated } = useAuth()

  const { data: lenser = null, isLoading } = useQuery<Lenser | null>({
    queryKey: queryKeys.lenser.authenticated(),
    queryFn: () => lenserService.getAuthenticatedLenser(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  })

  return {
    lenser,
    hasLenser: !!lenser,
    isLoading,
  }
}
