import { queryKeys } from '@lenserfight/data/cache'
import {
  SupabaseWorkspaceControlsRepository,
  type ListRunUnifiedOptions,
} from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'

const repo = new SupabaseWorkspaceControlsRepository()

export function useRunUnified(aiLenserId: string, options?: ListRunUnifiedOptions) {
  return useQuery({
    queryKey: queryKeys.agents.runUnified(aiLenserId, options),
    queryFn: () => repo.listRunUnified(aiLenserId, options),
    enabled: !!aiLenserId,
  })
}
