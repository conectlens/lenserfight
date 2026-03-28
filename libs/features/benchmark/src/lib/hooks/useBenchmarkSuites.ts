import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import { benchmarkService } from '@lenserfight/data/repositories'

export const useBenchmarkSuites = (creatorLenserId?: string) =>
  useQuery({
    queryKey: queryKeys.benchmark.suites(creatorLenserId),
    queryFn: () => benchmarkService.listSuites(creatorLenserId),
    staleTime: 1000 * 60 * 5,
  })
