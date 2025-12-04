
import { GenerationRepositoryPort, MockGenerationRepository, SupabaseGenerationRepository } from '../repositories/generationRepository';
import { isMock } from '../config/runtimeConfig';

export const getGenerationRepository = (): GenerationRepositoryPort => {
  if (isMock) {
    return new MockGenerationRepository();
  }
  return new SupabaseGenerationRepository();
};
