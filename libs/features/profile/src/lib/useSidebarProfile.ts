import { queryKeys } from '@lenserfight/data/cache'
import { lenserService } from '@lenserfight/data/repositories'
import { Lenser } from '@lenserfight/types'
import { useQuery } from '@tanstack/react-query'

export const useSidebarProfile = (handle?: string, profileId?: string) => {
  const { data: activeProfile = null, isLoading } = useQuery<Lenser | null>({
    queryKey: queryKeys.lenser.authenticated(),
    queryFn: () => lenserService.getActiveLenser(),
    enabled: !!handle && !!profileId,
    staleTime: 1000 * 60 * 5,
  })

  const profile =
    activeProfile?.id === profileId && activeProfile?.handle === handle
      ? activeProfile
      : null

  return { profile, isLoading }
}
