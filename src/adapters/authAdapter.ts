import { AuthRepositoryPort, MockAuthRepository, SupabaseAuthRepository } from '../repositories/authRepository';
import { isMock } from '../config/runtimeConfig';

export const getAuthRepository = (): AuthRepositoryPort => {
  if (isMock) {
    return new MockAuthRepository();
  }
  return new SupabaseAuthRepository();
};