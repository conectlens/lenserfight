import { queryKeys } from '@lenserfight/data/cache'
import { artifactLifecycleRepository } from '@lenserfight/data/repositories'
import type { ArtifactLifecycleType } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'

export function useArtifactLifecycleStatus(
  type: ArtifactLifecycleType | undefined,
  id: string | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.artifactLifecycle.status(type ?? '', id ?? ''),
    queryFn: () => artifactLifecycleRepository.getStatus(type!, id!),
    enabled: (options?.enabled ?? true) && !!type && !!id,
    staleTime: 30_000,
  })
}
