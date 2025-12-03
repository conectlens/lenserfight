import { PromptsRepositoryPort, MockPromptsRepository, SupabasePromptsRepository } from '../repositories/promptsRepository';
import { isMock } from '../config/runtimeConfig';

export const getPromptsRepository = (): PromptsRepositoryPort => {
  if (isMock) {
    return new MockPromptsRepository();
  }
  return new SupabasePromptsRepository();
};
