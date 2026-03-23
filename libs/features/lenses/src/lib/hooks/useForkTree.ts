import { useQuery } from '@tanstack/react-query'

import { lensesService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'

export const useForkTree = (lensId: string, parentLensId?: string | null) => {
  const enabled = !!lensId && !!parentLensId

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.lenses.forkTree(lensId),
    queryFn: () => lensesService.getForkTree(lensId),
    enabled,
    staleTime: 5 * 60 * 1000,
  })

  return { forkTree: data ?? [], isLoadingForkTree: isLoading }
}
