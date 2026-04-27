import type { AIModelCatalogEntry, AIProvider } from '@lenserfight/types'

import {
  SupabaseAICatalogRepository,
  type AIModelCatalogFilter,
} from '../repositories/aiCatalogRepository'

const aiCatalogRepo = new SupabaseAICatalogRepository()

export type { AIModelCatalogFilter }

export const aiCatalogService = {
  listProviders: (): Promise<AIProvider[]> => aiCatalogRepo.listProviders(),

  listModels: (filter?: AIModelCatalogFilter): Promise<AIModelCatalogEntry[]> =>
    aiCatalogRepo.listModels(filter),

  getModelDetail: (providerKey: string, modelKey: string): Promise<AIModelCatalogEntry | null> =>
    aiCatalogRepo.getModelDetail(providerKey, modelKey),
}
