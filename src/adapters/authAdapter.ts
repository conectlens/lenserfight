import { isMock } from '../config/runtimeConfig'
import {
  AuthRepositoryPort,
  MockAuthRepository,
  SupabaseAuthRepository,
} from '../repositories/authRepository'

export const getAuthRepository = (): AuthRepositoryPort => {
  if (isMock) {
    return new MockAuthRepository()
  }
  return new SupabaseAuthRepository()
}
