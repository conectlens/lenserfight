import { AdminAnalyticsData, AdminUser, AdminListResponse } from '@lenserfight/types'
import { ContactMessage } from '@lenserfight/types'
import { Feedback } from '@lenserfight/types'
import { Lenser } from '@lenserfight/types'
import { supabase } from '@lenserfight/data/supabase'

export interface AdminRepositoryPort {
  getAnalytics(days: number): Promise<AdminAnalyticsData>
  getUsers(offset: number, limit: number, query?: string): Promise<AdminListResponse<AdminUser>>
  getFeedbacks(offset: number, limit: number, status?: string): Promise<AdminListResponse<Feedback>>
  getWaitlist(offset: number, limit: number): Promise<AdminListResponse<Lenser>>
  getContacts(offset: number, limit: number): Promise<AdminListResponse<ContactMessage>>
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
  ): Promise<AdminListResponse<AdminUser>> {
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

    return {
      data: (data as any[]).map((u) => ({
        id: u.user_id,
        email: 'hidden',
        display_name: u.display_name,
        created_at: u.created_at,
        last_sign_in_at: u.last_login_at ?? u.updated_at,
        is_super_admin: u.is_super_admin,
      })),
      total: count || 0,
    }
  }

  async getFeedbacks(
    offset: number,
    limit: number,
    status?: string
  ): Promise<AdminListResponse<Feedback>> {
    let query = supabase.from('feedback').select('*', { count: 'exact' })
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    return { data: data as Feedback[], total: count || 0 }
  }

  async getWaitlist(offset: number, limit: number): Promise<AdminListResponse<Lenser>> {
    const { data, count, error } = await supabase
      .schema('lensers')
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('is_in_waiting_list', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    return { data: data as Lenser[], total: count || 0 }
  }

  async getContacts(offset: number, limit: number): Promise<AdminListResponse<ContactMessage>> {
    const { data, count, error } = await supabase
      .from('contact_messages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    return { data: data as ContactMessage[], total: count || 0 }
  }
}
