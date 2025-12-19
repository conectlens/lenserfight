import { isMock } from '../config/runtimeConfig'
import {
  ShareRepositoryPort,
  MockShareRepository,
  SupabaseShareRepository,
} from '../repositories/shareRepository'

export const getShareRepository = (): ShareRepositoryPort => {
  if (isMock) {
    return new MockShareRepository()
  }
  return new SupabaseShareRepository()
}
