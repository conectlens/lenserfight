import {
  AdminRepositoryPort,
  SupabaseAdminRepository,
} from '../repositories/adminRepository'

export const getAdminRepository = (): AdminRepositoryPort => {
  return new SupabaseAdminRepository()
}
