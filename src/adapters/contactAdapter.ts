
import { ContactRepositoryPort, MockContactRepository, SupabaseContactRepository } from '../repositories/contactRepository';
import { isMock } from '../config/runtimeConfig';

export const getContactRepository = (): ContactRepositoryPort => {
  if (isMock) {
    return new MockContactRepository();
  }
  return new SupabaseContactRepository();
};
