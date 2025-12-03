import { LenserRepositoryPort, MockLenserRepository, SupabaseLenserRepository } from '../repositories/lenserRepository';
import { isMock } from '../config/runtimeConfig';

export const getLenserRepository = (): LenserRepositoryPort => {
  if (isMock) {
    return new MockLenserRepository();
  }
  return new SupabaseLenserRepository();
};