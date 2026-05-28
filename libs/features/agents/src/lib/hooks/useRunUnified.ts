import { queryKeys } from '@lenserfight/data/cache'
import {
  SupabaseWorkspaceControlsRepository,
  type ListRunUnifiedOptions,
} from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'

const repo = new SupabaseWorkspaceControlsRepository()

// Always fetch with the server-side default limit (50) so all callers share the
// same cache entry regardless of how many rows they want to display. Client-side
// slicing is free and avoids the duplicate network request that occurred when
// ActiveRunsPanel (limit:10) and OverviewSection (limit:20) had different keys.
const SERVER_FETCH_LIMIT = 50

export function useRunUnified(aiLenserId: string, options?: ListRunUnifiedOptions) {
  const { data: rows = [], ...rest } = useQuery({
    queryKey: queryKeys.agents.runUnified(aiLenserId),
    queryFn: () => repo.listRunUnified(aiLenserId, { limit: SERVER_FETCH_LIMIT }),
    enabled: !!aiLenserId,
    staleTime: 30_000,
  })

  // Apply caller-requested filters client-side from the shared cache.
  let filtered = rows
  if (options?.status) filtered = filtered.filter((r) => (r as unknown as Record<string, unknown>)['status'] === options.status)
  if (options?.run_type) filtered = filtered.filter((r) => (r as unknown as Record<string, unknown>)['run_type'] === options.run_type)
  if (options?.limit && options.limit > 0) filtered = filtered.slice(0, options.limit)

  return { data: filtered, ...rest }
}
