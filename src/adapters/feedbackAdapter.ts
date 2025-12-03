import { FeedbackRepositoryPort, MockFeedbackRepository, SupabaseFeedbackRepository } from '../repositories/feedbackRepository';
import { isMock } from '../config/runtimeConfig';

export const getFeedbackRepository = (): FeedbackRepositoryPort => {
  if (isMock) {
    return new MockFeedbackRepository();
  }
  return new SupabaseFeedbackRepository();
};
