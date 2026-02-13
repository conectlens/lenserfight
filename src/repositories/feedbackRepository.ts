import { Feedback, SubmitFeedbackDTO } from '../types/feedback.types'
import { supabase } from '../utils/supabase'

// --- Port (Interface) ---
export interface FeedbackRepositoryPort {
  submitFeedback(dto: SubmitFeedbackDTO): Promise<void>
  getUserFeedbacks(offset?: number, limit?: number): Promise<{ data: Feedback[]; count: number }>
}
export class SupabaseFeedbackRepository implements FeedbackRepositoryPort {
  async submitFeedback(dto: SubmitFeedbackDTO) {
    const { data, error } = await supabase.rpc('fn_public_submit_feedback', {
      p_product_tag: dto.product_tag ?? 'general',
      p_page: dto.page,
      p_message: dto.message,
      p_start_date: dto.start_date ?? null,
      p_end_date: dto.end_date ?? null,
    })

    if (error) throw error
    if (data) {
      // data is non-null only if the function caught an error and returned details
      console.warn('Feedback RPC reported error:', data)
    }
  }

  async getUserFeedbacks(offset = 0, limit = 5): Promise<{ data: Feedback[]; count: number }> {
    const { data, error } = await supabase.rpc(
      'fn_analytics_product_feedback_list_user_paginated',
      {
        p_offset: offset,
        p_limit: limit,
      }
    )

    if (error) throw error

    const totalCount = data?.length ? data[0].total_count : 0

    const result = data?.map((row) => ({
      product_tag: row.product_tag,
      page: row.page,
      message: row.message,
      start_date: row.start_date,
      end_date: row.end_date,
      status: row.status,
      created_at: row.created_at,
    })) as Feedback[]

    return { data: result, count: totalCount }
  }
}
