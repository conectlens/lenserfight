import { useQuery } from '@tanstack/react-query'
import { generationService } from '@lenserfight/data/repositories'
import { AIProvider, AIProviderModel } from '@lenserfight/types'

export const useAIProviders = (options?: { enabled?: boolean }) => {
  return useQuery<AIProvider[]>({
    queryKey: ['ai-providers'],
    queryFn: () => generationService.getActiveProviders(),
    staleTime: 10 * 60_000,
    enabled: options?.enabled ?? true,
  })
}

export const useAIModelsByProvider = (providerKey: string | null) => {
  return useQuery<AIProviderModel[]>({
    queryKey: ['ai-models-by-provider', providerKey],
    queryFn: () => generationService.getModelsByProvider(providerKey!),
    enabled: !!providerKey,
    staleTime: 5 * 60_000,
  })
}
