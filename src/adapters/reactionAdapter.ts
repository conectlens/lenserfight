
import { ReactionRepositoryPort, MockReactionRepository, SupabaseReactionRepository } from '../repositories/reactionRepository';
import { isMock } from '../config/runtimeConfig';

export const getReactionRepository = (): ReactionRepositoryPort => {
  if (isMock) {
    return new MockReactionRepository();
  }
  return new SupabaseReactionRepository();
};
