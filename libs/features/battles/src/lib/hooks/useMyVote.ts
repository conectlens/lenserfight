import { battlesService } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'

export const useMyVote = (battleId?: string, userId?: string) => {
  const { data, isLoading } = useQuery({
    queryKey: ['my-vote', battleId, userId],
    queryFn: () => battlesService.getMyVote(battleId!),
    enabled: !!battleId && !!userId,
    staleTime: 1000 * 60 * 5,
  })
  return { myVote: data ?? null, isLoading }
}
