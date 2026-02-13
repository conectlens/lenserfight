import {
  XPRepositoryPort,
  SupabaseXPRepository,
} from '../repositories/xpRepository'

export const getXPRepository = (): XPRepositoryPort => {
  return new SupabaseXPRepository()
}
