import { isMock } from '../config/runtimeConfig'
import {
  TagRepositoryPort,
  MockTagRepository,
  SupabaseTagRepository,
} from '../repositories/tagRepository'

export const getTagRepository = (): TagRepositoryPort => {
  if (isMock) {
    return new MockTagRepository()
  }
  return new SupabaseTagRepository()
}
