import { AdminAnalyticsData, AdminUser } from '@lenserfight/types'
import { ContactMessage } from '@lenserfight/types'
import { Feedback } from '@lenserfight/types'
import { Lenser } from '@lenserfight/types'
import { supabase } from '@lenserfight/data/supabase'
import { ApiResponseEnvelope, paginatedResponse } from 'contracts'

export interface AdminRepositoryPort {
  getAnalytics(days: number): Promise<AdminAnalyticsData>
  getUsers(offset: number, limit: number, query?: string): Promise<ApiResponseEnvelope<AdminUser[]>>
  getFeedbacks(offset: number, limit: number, status?: string): Promise<ApiResponseEnvelope<Feedback[]>>
  getWaitlist(offset: number, limit: number): Promise<ApiResponseEnvelope<Lenser[]>>
  getContacts(offset: number, limit: number): Promise<ApiResponseEnvelope<ContactMessage[]>>
}

export class SupabaseAdminRepository implements AdminRepositoryPort {
  async getAnalytics(days: number): Promise<AdminAnalyticsData> {
    const { data, error } = await supabase.rpc('get_admin_analytics', { days_back: days })
    if (error) {
      console.warn('Analytics RPC missing, returning empty', error)
      return { registrations: [], threads: [], pageViews: [] }
    }
    return data as AdminAnalyticsData
  }

  async getUsers(
    offset: number,
    limit: number,
    query?: string
  ): Promise<ApiResponseEnvelope<AdminUser[]>> {
    const start = Date.now()
    let queryBuilder = supabase
      .schema('lensers')
      .from('profiles')
      .select('id, user_id, handle, display_name, created_at, updated_at, last_login_at, is_super_admin', { count: 'exact' })

    if (query) {
      queryBuilder = queryBuilder.ilike('display_name', `%${query}%`)
    }

    const { data, count, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    const total = count ?? 0
    const items: AdminUser[] = (data as any[]).map((u) => ({
      id: u.user_id,
      email: 'hidden',
      display_name: u.display_name,
      created_at: u.created_at,
      last_sign_in_at: u.last_login_at ?? u.updated_at,
      is_super_admin: u.is_super_admin,
    }))
    return paginatedResponse(
      items,
      { limit, offset, total, hasNextPage: offset + limit < total },
      { durationMs: Date.now() - start },
    )
  }

  async getFeedbacks(
    offset: number,
    limit: number,
    status?: string
  ): Promise<ApiResponseEnvelope<Feedback[]>> {
    const start = Date.now()
    let query = supabase.from('feedback').select('*', { count: 'exact' })
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    const total = count ?? 0
    return paginatedResponse(
      (data ?? []) as Feedback[],
      { limit, offset, total, hasNextPage: offset + limit < total },
      { durationMs: Date.now() - start },
    )
  }

  async getWaitlist(offset: number, limit: number): Promise<ApiResponseEnvelope<Lenser[]>> {
    const start = Date.now()
    const { data, count, error } = await supabase
      .schema('lensers')
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('is_in_waiting_list', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    const total = count ?? 0
    return paginatedResponse(
      (data ?? []) as Lenser[],
      { limit, offset, total, hasNextPage: offset + limit < total },
      { durationMs: Date.now() - start },
    )
  }

  async getContacts(offset: number, limit: number): Promise<ApiResponseEnvelope<ContactMessage[]>> {
    const start = Date.now()
    const { data, count, error } = await supabase
      .from('contact_messages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    const total = count ?? 0
    return paginatedResponse(
      (data ?? []) as ContactMessage[],
      { limit, offset, total, hasNextPage: offset + limit < total },
      { durationMs: Date.now() - start },
    )
  }
}
