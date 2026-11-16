import { queryKeys } from '@lenserfight/data/cache'
import { artifactLifecycleRepository } from '@lenserfight/data/repositories'
import type { ArtifactLifecycleStatus, ArtifactLifecycleType } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'

/**
 * Lifecycle status for a whole list of artifacts in one request.
 *
 * Rendering one ArtifactLifecycleMenu per row means one status request per row,
 * so a page of N cards costs N round-trips just to paint N badges. Fetch the
 * page's statuses here and hand each menu its own via the `status` prop; a menu
 * given a status does not query.
 *
 * The result is keyed by artifact id. Ids the caller cannot view are absent
 * rather than throwing, so a single hidden artifact does not blank the list —
 * a menu that gets `undefined` simply falls back to fetching its own status.
 *
 * `ids` is read by value into the query key, so callers may pass a fresh array
 * each render without causing a refetch; only a change in the set of ids does.
 */
export function useArtifactLifecycleStatuses(
  type: ArtifactLifecycleType | undefined,
  ids: readonly string[],
  options?: { enabled?: boolean },
) {
  return useQuery<Record<string, ArtifactLifecycleStatus>>({
    queryKey: queryKeys.artifactLifecycle.statusBatch(type ?? '', ids),
    queryFn: () => artifactLifecycleRepository.getStatusBatch(type!, [...ids]),
    enabled: (options?.enabled ?? true) && !!type && ids.length > 0,
    // Matches useArtifactLifecycleStatus so a list and a detail view opened
    // back to back agree on how long a status stays fresh.
    staleTime: 30_000,
  })
}
