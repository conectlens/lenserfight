import { useQuery } from '@tanstack/react-query'
import { generationService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'
import { AIModel } from '@lenserfight/types'

export const useAIModels = () => {
  const { data: models = [], isLoading } = useQuery<AIModel[]>({
    queryKey: queryKeys.aiModels.all,
    queryFn: () => generationService.getAIModels(),
    staleTime: 5 * 60_000,
  })
  return { models, isLoading }
}
