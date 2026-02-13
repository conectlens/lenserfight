import {
  ReactionRepositoryPort,
  SupabaseReactionRepository,
} from '../repositories/reactionRepository'

export const getReactionRepository = (): ReactionRepositoryPort => {
  return new SupabaseReactionRepository()
}
