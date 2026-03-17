import { Feedback, SubmitFeedbackDTO } from '@lenserfight/types'
import { supabase } from '@lenserfight/data/supabase'
import { ApiResponseEnvelope, paginatedResponse } from 'contracts'

// --- Port (Interface) ---
export interface FeedbackRepositoryPort {
  submitFeedback(dto: SubmitFeedbackDTO): Promise<void>
  getUserFeedbacks(offset?: number, limit?: number): Promise<ApiResponseEnvelope<Feedback[]>>
}
export class SupabaseFeedbackRepository implements FeedbackRepositoryPort {
  async submitFeedback(dto: SubmitFeedbackDTO) {
    let message = dto.message
    if (message != null) {
      message = message.trim()
      if (message.length < 10 || message.length > 2000) {
        throw new Error('Feedback message must be between 10 and 2000 characters.')
      }
    }

    const { error } = await supabase.schema('analytics').from('product_feedback').insert({
      product_tag: dto.product_tag ?? 'general',
      page: dto.page,
      message: message,
      start_date: dto.start_date ?? null,
      end_date: dto.end_date ?? null,
    })

    if (error) throw error
  }

  async getUserFeedbacks(offset = 0, limit = 5): Promise<ApiResponseEnvelope<Feedback[]>> {
    const start = Date.now()
    const { data, error } = await supabase.rpc(
      'fn_analytics_product_feedback_list_user_paginated',
      {
        p_offset: offset,
        p_limit: limit,
      }
    )

    if (error) throw error

    const total = data?.length ? (data[0].total_count as number) : 0
    const items: Feedback[] = (data ?? []).map((row) => ({
      product_tag: row.product_tag,
      page: row.page,
      message: row.message,
      start_date: row.start_date,
      end_date: row.end_date,
      status: row.status,
      created_at: row.created_at,
    }))

    return paginatedResponse(
      items,
      { limit, offset, total, hasNextPage: offset + limit < total },
      { durationMs: Date.now() - start },
    )
  }
}
