import type { AIModelCatalogEntry, AIProvider } from '@lenserfight/types'

import { type AIModelCatalogFilter,
} from '../repositories/aiCatalogRepository'
import { createAICatalogRepository } from '../factory'


const aiCatalogRepo = createAICatalogRepository()

export type { AIModelCatalogFilter }

export const aiCatalogService = {
  listProviders: (): Promise<AIProvider[]> => aiCatalogRepo.listProviders(),

  listModels: (filter?: AIModelCatalogFilter): Promise<AIModelCatalogEntry[]> =>
    aiCatalogRepo.listModels(filter),

  getModelDetail: (providerKey: string, modelKey: string): Promise<AIModelCatalogEntry | null> =>
    aiCatalogRepo.getModelDetail(providerKey, modelKey),
}
