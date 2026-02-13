import {
  GenerationRepositoryPort,
  SupabaseGenerationRepository,
} from '../repositories/generationRepository'

export const getGenerationRepository = (): GenerationRepositoryPort => {
  return new SupabaseGenerationRepository()
}
