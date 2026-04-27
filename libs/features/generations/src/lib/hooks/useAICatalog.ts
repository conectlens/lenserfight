import { queryKeys } from '@lenserfight/data/cache'
import { aiCatalogService, apiKeysService } from '@lenserfight/data/repositories'
import type { AIModelCatalogEntry, AIProvider, UserApiKey } from '@lenserfight/types'
import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@lenserfight/features/auth'

export interface UseAICatalogModelsFilter {
  providerKey?: string
  supportLevel?: string
  capability?: string
  modality?: string
}

export function useAICatalogProviders() {
  return useQuery<AIProvider[]>({
    queryKey: queryKeys.aiCatalog.providers(),
    queryFn: () => aiCatalogService.listProviders(),
    staleTime: 5 * 60_000,
  })
}

export function useAICatalogModels(filter: UseAICatalogModelsFilter = {}) {
  return useQuery<AIModelCatalogEntry[]>({
    queryKey: queryKeys.aiCatalog.models(filter as Record<string, unknown>),
    queryFn: () => aiCatalogService.listModels(filter),
    staleTime: 5 * 60_000,
  })
}

export function useAICatalogModelDetail(providerKey?: string, modelKey?: string) {
  return useQuery<AIModelCatalogEntry | null>({
    queryKey: queryKeys.aiCatalog.modelDetail(providerKey ?? '', modelKey ?? ''),
    queryFn: () => aiCatalogService.getModelDetail(providerKey!, modelKey!),
    enabled: !!providerKey && !!modelKey,
    staleTime: 5 * 60_000,
  })
}

export function useCatalogProviderKeys() {
  const { isAuthenticated } = useAuth()

  return useQuery<UserApiKey[]>({
    queryKey: queryKeys.apiKeys.myKeys(),
    queryFn: () => apiKeysService.getMyKeys(),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  })
}
