import { isMock } from '../config/runtimeConfig'
import {
  AdminRepositoryPort,
  MockAdminRepository,
  SupabaseAdminRepository,
} from '../repositories/adminRepository'

export const getAdminRepository = (): AdminRepositoryPort => {
  if (isMock) {
    return new MockAdminRepository()
  }
  return new SupabaseAdminRepository()
}
