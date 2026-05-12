import { voteAnomalyRepository, type VoteAnomalyStatusFilter } from '@lenserfight/data/repositories'
import { useMutation, useQuery } from '@tanstack/react-query'

export const voteAnomaliesQueryKey = (status: VoteAnomalyStatusFilter, battleId?: string | null) =>
  ['vote-anomalies', status, battleId ?? null] as const

export function useVoteAnomalies(
  status: VoteAnomalyStatusFilter = 'pending',
  battleId?: string | null
) {
  return useQuery({
    queryKey: voteAnomaliesQueryKey(status, battleId),
    queryFn: () => voteAnomalyRepository.getVoteAnomalies(status, battleId),
    staleTime: 1000 * 30,
  })
}

export function useResolveVoteAnomaly() {
  return useMutation({
    mutationFn: (anomalyId: string) => voteAnomalyRepository.resolveVoteAnomaly(anomalyId),
  })
}
