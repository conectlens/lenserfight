
import { PreferencesRepositoryPort, MockPreferencesRepository, SupabasePreferencesRepository } from '../repositories/preferencesRepository';
import { isMock } from '../config/runtimeConfig';

export const getPreferencesRepository = (): PreferencesRepositoryPort => {
  if (isMock) {
    return new MockPreferencesRepository();
  }
  return new SupabasePreferencesRepository();
};