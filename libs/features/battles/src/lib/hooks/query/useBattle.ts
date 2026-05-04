import { queryKeys } from '@lenserfight/data/cache'
import { battlesService } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'

import type { Battle } from '../../types/battle.types'

export const useBattle = (slug?: string) => {
  return useQuery<Battle | null, Error>({
    queryKey: queryKeys.battles.detail(slug ?? ''),
    queryFn: () => battlesService.getBattleBySlug(slug!),
    enabled: !!slug,
    staleTime: 1000 * 60 * 2,
  })
}
