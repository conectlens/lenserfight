
import { getFeedbackRepository } from '../adapters/feedbackAdapter';
import { SubmitFeedbackDTO, FeedbackResponse } from '../types/feedback.types';
import { contentModerationService } from './contentModerationService';

const feedbackRepo = getFeedbackRepository();

export const feedbackService = {
  submitFeedback: async (dto: SubmitFeedbackDTO): Promise<void> => {
    // 1. Validate Message Logic
    if (!dto.message || dto.message.trim().length === 0) {
      throw new Error("Message is required.");
    }
    if (dto.message.length > 2000) {
      throw new Error("Message exceeds the 2000 character limit.");
    }

    // 2. Validate Dates
    if (dto.end_date && !dto.start_date) {
      throw new Error("Start date is required when an end date is provided.");
    }

    if (dto.start_date && dto.end_date) {
      const start = new Date(dto.start_date);
      const end = new Date(dto.end_date);
      if (start >= end) {
        throw new Error("Start date must be before end date.");
      }
    }

    // 3. Moderation Check
    // TODO: moderation policy will not be used in the beta version
    // await contentModerationService.validate(dto.message);

    // 4. Submit
    await feedbackRepo.submitFeedback(dto);
  },

  getUserFeedbacks: async (userId: string, page = 1, limit = 5): Promise<FeedbackResponse> => {
      const offset = (page - 1) * limit;
      const { data, count } = await feedbackRepo.getUserFeedbacks(userId, offset, limit);
      return { data, total: count };
  }
};
