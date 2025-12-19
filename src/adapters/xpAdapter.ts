import { isMock } from '../config/runtimeConfig'
import {
  XPRepositoryPort,
  MockXPRepository,
  SupabaseXPRepository,
} from '../repositories/xpRepository'

export const getXPRepository = (): XPRepositoryPort => {
  if (isMock) {
    return new MockXPRepository()
  }
  return new SupabaseXPRepository()
}
