import { queryKeys } from '@lenserfight/data/cache'
import { battlesService } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'

export function useLensAssignment(contenderId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.battles.lensAssignment(contenderId ?? ''),
    queryFn: () => battlesService.getLensAssignment(contenderId!),
    enabled: !!contenderId,
    staleTime: 1000 * 60,
  })
}
