import {
  ShareRepositoryPort,
  SupabaseShareRepository,
} from '../repositories/shareRepository'

export const getShareRepository = (): ShareRepositoryPort => {
  return new SupabaseShareRepository()
}
