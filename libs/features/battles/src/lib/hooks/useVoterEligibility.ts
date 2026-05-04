import { useQuery } from '@tanstack/react-query'
import { battlesService } from '@lenserfight/data/repositories'

export const useVoterEligibility = (battleId?: string, lenserId?: string) => {
  const { data: isEligible = true } = useQuery({
    queryKey: ['battles', 'eligibility', battleId, lenserId],
    queryFn: () => battlesService.checkVoterEligibility(battleId!, lenserId!),
    enabled: !!battleId && !!lenserId,
    staleTime: 1000 * 60,
  })

  return { isEligible }
}
