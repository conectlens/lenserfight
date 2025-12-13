
import { Feedback, SubmitFeedbackDTO, ProductTag } from '../types/feedback.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

// --- Port (Interface) ---
export interface FeedbackRepositoryPort {
  submitFeedback(dto: SubmitFeedbackDTO): Promise<void>;
  getUserFeedbacks(offset?: number, limit?: number): Promise<{ data: Feedback[]; count: number }>;
}

// --- Mock Implementation ---
export class MockFeedbackRepository implements FeedbackRepositoryPort {
  private STORAGE_KEY = 'mock_feedback_db';

  async submitFeedback(dto: SubmitFeedbackDTO): Promise<void> {
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
  }

  async getUserFeedbacks(offset = 0, limit = 5): Promise<{ data: Feedback[]; count: number }> {
    await new Promise(resolve => setTimeout(resolve, 600));
    const all = JSON.parse(storage.getItem(this.STORAGE_KEY) || '[]');
    const userFeedbacks = all.filter((f: Feedback) => f.user_id === "userId");
    
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
  async submitFeedback(dto: SubmitFeedbackDTO) {
    const { data, error } = await supabase.rpc(
      'fn_public_submit_feedback',
      {
        p_product_tag: dto.product_tag ?? 'general',
        p_page: dto.page,
        p_message: dto.message,
        p_start_date: dto.start_date ?? null,
        p_end_date: dto.end_date ?? null
      }
    );

    if (error) throw error;
    if (data) {
      // data is non-null only if the function caught an error and returned details
      console.warn("Feedback RPC reported error:", data);
    }
  }
  
async getUserFeedbacks(offset = 0, limit = 5): Promise<{ data: Feedback[]; count: number }> {
  const { data, error } = await supabase.rpc(
    'fn_analytics_product_feedback_list_user_paginated',
    {
      p_offset: offset,
      p_limit: limit,
    }
  );

  if (error) throw error;

  const totalCount = data?.length ? data[0].total_count : 0;

  const result = data?.map(row => ({
    product_tag: row.product_tag,
    page: row.page,
    message: row.message,
    start_date: row.start_date,
    end_date: row.end_date,
    status: row.status,
    created_at: row.created_at
  })) as Feedback[];

  return { data: result, count: totalCount };
}

}
