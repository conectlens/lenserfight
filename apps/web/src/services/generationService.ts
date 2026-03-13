import { SupabaseGenerationRepository } from '../repositories/generationRepository'
import {
  CreateGenerationDTO,
  AIGeneration,
  GenerationFilterOptions,
  AIModel,
} from '../types/generation.types'

const repo = new SupabaseGenerationRepository()

export const generationService = {
  getGenerations: async (
    promptId: string,
    lenserId: string,
    options?: GenerationFilterOptions
  ): Promise<AIGeneration[]> => {
    if (!promptId || !lenserId) return []
    return repo.getGenerationsForPrompt(promptId, lenserId, options)
  },

  createGeneration: async (data: CreateGenerationDTO): Promise<void> => {
    return repo.createGeneration(data)
  },

  deleteGeneration: async (id: string, lenserId: string): Promise<void> => {
    // In a real app, we might verify ownership again here or rely on RLS/Repo logic
    return repo.deleteGeneration(id)
  },

  getAIModels: async (): Promise<AIModel[]> => {
    return repo.getAIModels()
  },
}
