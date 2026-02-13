import {
  FeedbackRepositoryPort,
  SupabaseFeedbackRepository,
} from '../repositories/feedbackRepository'

export const getFeedbackRepository = (): FeedbackRepositoryPort => {
  return new SupabaseFeedbackRepository()
}
