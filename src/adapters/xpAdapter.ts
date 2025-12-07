
import { XPRepositoryPort, MockXPRepository, SupabaseXPRepository } from '../repositories/xpRepository';
import { isMock } from '../config/runtimeConfig';

export const getXPRepository = (): XPRepositoryPort => {
  if (isMock) {
    return new MockXPRepository();
  }
  return new SupabaseXPRepository();
};
