import {
  ContactRepositoryPort,
  SupabaseContactRepository,
} from '../repositories/contactRepository'

export const getContactRepository = (): ContactRepositoryPort => {
  return new SupabaseContactRepository()
}
