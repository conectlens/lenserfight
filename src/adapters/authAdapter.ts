import {
  AuthRepositoryPort,
  SupabaseAuthRepository,
} from '../repositories/authRepository'

export const getAuthRepository = (): AuthRepositoryPort => {
  return new SupabaseAuthRepository()
}
