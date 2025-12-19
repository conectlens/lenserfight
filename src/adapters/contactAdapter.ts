import { isMock } from '../config/runtimeConfig'
import {
  ContactRepositoryPort,
  MockContactRepository,
  SupabaseContactRepository,
} from '../repositories/contactRepository'

export const getContactRepository = (): ContactRepositoryPort => {
  if (isMock) {
    return new MockContactRepository()
  }
  return new SupabaseContactRepository()
}
