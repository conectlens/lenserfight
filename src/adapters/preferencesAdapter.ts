import {
  PreferencesRepositoryPort,
  SupabasePreferencesRepository,
} from '../repositories/preferencesRepository'

export const getPreferencesRepository = (): PreferencesRepositoryPort => {
  return new SupabasePreferencesRepository()
}
