import { getFeedbackRepository } from '../adapters/feedbackAdapter';
import { SubmitFeedbackDTO } from '../types/feedback.types';

const feedbackRepo = getFeedbackRepository();

export const feedbackService = {
  submitFeedback: async (dto: SubmitFeedbackDTO): Promise<void> => {
    // 1. Validate Message
    if (!dto.message || dto.message.trim().length === 0) {
      throw new Error("Message is required.");
    }
    if (dto.message.length > 2000) {
      throw new Error("Message exceeds the 2000 character limit.");
    }

    // 2. Validate Dates
    // If end_date is present, start_date must be present (Requirement 4)
    if (dto.end_date && !dto.start_date) {
      throw new Error("Start date is required when an end date is provided.");
    }

    // If both are present, start < end
    if (dto.start_date && dto.end_date) {
      const start = new Date(dto.start_date);
      const end = new Date(dto.end_date);
      if (start >= end) {
        throw new Error("Start date must be before end date.");
      }
    }

    // 3. Submit
    await feedbackRepo.submitFeedback(dto);
  }
};
