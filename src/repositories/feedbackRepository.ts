
import { Feedback, SubmitFeedbackDTO, ProductTag } from '../types/feedback.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

// --- Port (Interface) ---
export interface FeedbackRepositoryPort {
  submitFeedback(dto: SubmitFeedbackDTO): Promise<Feedback>;
  getUserFeedbacks(userId: string, offset?: number, limit?: number): Promise<{ data: Feedback[]; count: number }>;
}

// --- Mock Implementation ---
export class MockFeedbackRepository implements FeedbackRepositoryPort {
  private STORAGE_KEY = 'mock_feedback_db';

  async submitFeedback(dto: SubmitFeedbackDTO): Promise<Feedback> {
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network

    const newFeedback: Feedback = {
      id: `feedback-${Date.now()}`,
      product_tag: dto.product_tag || 'general',
      page: dto.page || null,
      user_id: dto.user_id || null,
      message: dto.message || null,
      start_date: dto.start_date || null,
      end_date: dto.end_date || null,
      status: 'pending',
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

  async getUserFeedbacks(userId: string, offset = 0, limit = 5): Promise<{ data: Feedback[]; count: number }> {
    await new Promise(resolve => setTimeout(resolve, 600));
    const all = JSON.parse(storage.getItem(this.STORAGE_KEY) || '[]');
    const userFeedbacks = all.filter((f: Feedback) => f.user_id === userId);
    
    // Sort descending by created_at
    userFeedbacks.sort((a: Feedback, b: Feedback) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return {
        data: userFeedbacks.slice(offset, offset + limit),
        count: userFeedbacks.length
    };
  }
}

// --- Supabase Implementation ---
export class SupabaseFeedbackRepository implements FeedbackRepositoryPort {
  async submitFeedback(dto: SubmitFeedbackDTO): Promise<Feedback> {
    const { data, error } = await supabase
      .from('feedback')
      .insert({
        product_tag: dto.product_tag,
        page: dto.page,
        message: dto.message,
        start_date: dto.start_date,
        end_date: dto.end_date
      });

    if (error) throw error;
    return data as Feedback;
  }

  async getUserFeedbacks(userId: string, offset = 0, limit = 5): Promise<{ data: Feedback[]; count: number }> {
    // Use the secure view which filters by auth.uid() automatically.
    // Note: The view does not return 'id', so pagination relies on offset/limit.
    const { data, error, count } = await supabase
        .from('vw_feedback_user')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
        
    if (error) throw error;
    
    // Data returned matches the view structure (no id, no user_id)
    return { data: data as Feedback[], count: count || 0 };
  }
}
