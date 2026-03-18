import { useQuery } from '@tanstack/react-query'
import { lenserService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'
import type { LenserType } from '@lenserfight/types'

export const useLensers = (type?: LenserType) =>
  useQuery({
    queryKey: queryKeys.lenser.list(type),
    queryFn: () => lenserService.listLensers({ type, limit: 20 }),
    staleTime: 1000 * 60 * 5,
  })
