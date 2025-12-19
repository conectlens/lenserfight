import { isMock } from '../config/runtimeConfig'
import {
  FeedbackRepositoryPort,
  MockFeedbackRepository,
  SupabaseFeedbackRepository,
} from '../repositories/feedbackRepository'

export const getFeedbackRepository = (): FeedbackRepositoryPort => {
  if (isMock) {
    return new MockFeedbackRepository()
  }
  return new SupabaseFeedbackRepository()
}
