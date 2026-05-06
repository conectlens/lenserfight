import { useQuery } from '@tanstack/react-query'
import { socialGraphRepository, FollowStatus } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'

const QUERY_KEY_PREFIX = ['social', 'follow-status'] as const

export function useFollowStatus(targetProfileId: string | undefined): {
  status: FollowStatus
  isLoading: boolean
} {
  const { isAuthenticated } = useAuth()

  const { data = 'none', isLoading } = useQuery({
    queryKey: [...QUERY_KEY_PREFIX, targetProfileId],
    queryFn:  () => socialGraphRepository.getFollowStatus(targetProfileId!),
    enabled:  !!targetProfileId && isAuthenticated,
    staleTime: 30_000,
  })

  return { status: data as FollowStatus, isLoading }
}
