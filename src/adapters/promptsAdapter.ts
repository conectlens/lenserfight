import {
  PromptsRepositoryPort,
  SupabasePromptsRepository,
} from '../repositories/promptsRepository'

export const getPromptsRepository = (): PromptsRepositoryPort => {
  return new SupabasePromptsRepository()
}
