import { isMock } from '../config/runtimeConfig'
import {
  GenerationRepositoryPort,
  MockGenerationRepository,
  SupabaseGenerationRepository,
} from '../repositories/generationRepository'

export const getGenerationRepository = (): GenerationRepositoryPort => {
  if (isMock) {
    return new MockGenerationRepository()
  }
  return new SupabaseGenerationRepository()
}
