
import { AdminRepositoryPort, MockAdminRepository, SupabaseAdminRepository } from '../repositories/adminRepository';
import { isMock } from '../config/runtimeConfig';

export const getAdminRepository = (): AdminRepositoryPort => {
  if (isMock) {
    return new MockAdminRepository();
  }
  return new SupabaseAdminRepository();
};
