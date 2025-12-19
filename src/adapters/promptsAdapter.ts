import { isMock } from '../config/runtimeConfig'
import {
  PromptsRepositoryPort,
  MockPromptsRepository,
  SupabasePromptsRepository,
} from '../repositories/promptsRepository'

export const getPromptsRepository = (): PromptsRepositoryPort => {
  if (isMock) {
    return new MockPromptsRepository()
  }
  return new SupabasePromptsRepository()
}
