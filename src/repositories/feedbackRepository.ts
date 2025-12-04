
import { Feedback, SubmitFeedbackDTO } from '../types/feedback.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

// --- Port (Interface) ---
export interface FeedbackRepositoryPort {
  submitFeedback(dto: SubmitFeedbackDTO): Promise<Feedback>;
}

// --- Mock Implementation ---
export class MockFeedbackRepository implements FeedbackRepositoryPort {
  private STORAGE_KEY = 'mock_feedback_db';

  async submitFeedback(dto: SubmitFeedbackDTO): Promise<Feedback> {
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network

    const newFeedback: Feedback = {
      id: `feedback-${Date.now()}`,
      product_tag: dto.product_tag || null,
      page: dto.page || null,
      user_id: dto.user_id || null,
      message: dto.message || null,
      start_date: dto.start_date || null,
      end_date: dto.end_date || null,
      created_at: new Date().toISOString(),
    };

    const existingJson = storage.getItem(this.STORAGE_KEY);
    const existing = existingJson ? JSON.parse(existingJson) : [];
    existing.push(newFeedback);
    storage.setItem(this.STORAGE_KEY, JSON.stringify(existing));

    console.group("Mock Feedback Submitted");
    console.log("Data:", newFeedback);
    console.groupEnd();

    return newFeedback;
  }
}

// --- Supabase Implementation ---
export class SupabaseFeedbackRepository implements FeedbackRepositoryPort {
  async submitFeedback(dto: SubmitFeedbackDTO): Promise<Feedback> {
    // We omit user_id here. Supabase RLS policies should automatically attach the authenticated user's ID
    // or defaults to NULL if anonymous, based on `auth.uid()`.
    const { data, error } = await supabase
      .from('feedback')
      .insert({
        product_tag: dto.product_tag,
        page: dto.page,
        message: dto.message,
        start_date: dto.start_date,
        end_date: dto.end_date
      })
      .select()
      .single();

    if (error) throw error;
    return data as Feedback;
  }
}
