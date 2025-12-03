
import { TagRepositoryPort, MockTagRepository, SupabaseTagRepository } from '../repositories/tagRepository';
import { isMock } from '../config/runtimeConfig';

export const getTagRepository = (): TagRepositoryPort => {
  if (isMock) {
    return new MockTagRepository();
  }
  return new SupabaseTagRepository();
};
