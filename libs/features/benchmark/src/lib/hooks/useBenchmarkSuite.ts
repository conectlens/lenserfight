import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import { benchmarkService } from '@lenserfight/data/repositories'

export const useBenchmarkSuite = (suiteId: string | undefined) => {
  const suite = useQuery({
    queryKey: queryKeys.benchmark.suite(suiteId ?? ''),
    queryFn: () => benchmarkService.getSuite(suiteId!),
    enabled: !!suiteId,
    staleTime: 1000 * 60 * 5,
  })

  const tasks = useQuery({
    queryKey: queryKeys.benchmark.tasks(suiteId ?? ''),
    queryFn: () => benchmarkService.getTasksBySuite(suiteId!),
    enabled: !!suiteId,
    staleTime: 1000 * 60 * 5,
  })

  return { suite, tasks }
}
