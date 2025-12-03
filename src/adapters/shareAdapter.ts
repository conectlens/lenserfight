import { ShareRepositoryPort, MockShareRepository, SupabaseShareRepository } from '../repositories/shareRepository';
import { isMock } from '../config/runtimeConfig';

export const getShareRepository = (): ShareRepositoryPort => {
  if (isMock) {
    return new MockShareRepository();
  }
  return new SupabaseShareRepository();
};
