import { isMock } from '../config/runtimeConfig'
import {
  ReactionRepositoryPort,
  MockReactionRepository,
  SupabaseReactionRepository,
} from '../repositories/reactionRepository'

export const getReactionRepository = (): ReactionRepositoryPort => {
  if (isMock) {
    return new MockReactionRepository()
  }
  return new SupabaseReactionRepository()
}
