import {
  TagRepositoryPort,
  SupabaseTagRepository,
} from '../repositories/tagRepository'

export const getTagRepository = (): TagRepositoryPort => {
  return new SupabaseTagRepository()
}
