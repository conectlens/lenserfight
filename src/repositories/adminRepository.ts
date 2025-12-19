import { AdminAnalyticsData, AdminUser, AdminListResponse } from '../types/admin.types'
import { ContactMessage } from '../types/contact.types'
import { Feedback } from '../types/feedback.types'
import { Lenser } from '../types/lenser.types'
import { storage } from '../utils/storage'
import { supabase } from '../utils/supabase'

export interface AdminRepositoryPort {
  getAnalytics(days: number): Promise<AdminAnalyticsData>
  getUsers(offset: number, limit: number, query?: string): Promise<AdminListResponse<AdminUser>>
  getFeedbacks(offset: number, limit: number, status?: string): Promise<AdminListResponse<Feedback>>
  getWaitlist(offset: number, limit: number): Promise<AdminListResponse<Lenser>>
  getContacts(offset: number, limit: number): Promise<AdminListResponse<ContactMessage>>
}

export class MockAdminRepository implements AdminRepositoryPort {
  async getAnalytics(days: number): Promise<AdminAnalyticsData> {
    await new Promise((r) => setTimeout(r, 600))

    // Improved Generator for Realistic Trends
    const generateSeries = (base: number, volatility: number, trend: number) => {
      const series = []
      let currentValue = base

      for (let i = days; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)

        // Random walk
        const change = (Math.random() - 0.5) * volatility + trend
        currentValue = Math.max(0, currentValue + change)

        // Add some noise
        const noise = (Math.random() - 0.5) * (volatility / 2)

        series.push({
          date: d.toISOString().split('T')[0],
          count: Math.round(currentValue + noise),
        })
      }
      return series
    }

    return {
      registrations: generateSeries(10, 5, 0.5), // Growing trend
      threads: generateSeries(40, 15, 0.2), // Stable but noisy
      pageViews: generateSeries(500, 100, 2), // High volume growing
    }
  }

  async getUsers(
    offset: number,
    limit: number,
    query?: string
  ): Promise<AdminListResponse<AdminUser>> {
    await new Promise((r) => setTimeout(r, 400))
    const mockUsers = JSON.parse(storage.getItem('mock_users_db') || '[]') as any[]
    // Mock users DB usually has is_super_admin in the mock logic even if removed from types for clean API usage
    let users: AdminUser[] = mockUsers.map((u) => ({
      id: u.id,
      email: u.email,
      display_name: u.user_metadata?.display_name || 'Unknown',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      is_super_admin: u.is_super_admin,
    }))

    if (query) {
      users = users.filter(
        (u) =>
          u.email.toLowerCase().includes(query.toLowerCase()) ||
          u.display_name.toLowerCase().includes(query.toLowerCase())
      )
    }

    users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return {
      data: users.slice(offset, offset + limit),
      total: users.length,
    }
  }

  async getFeedbacks(
    offset: number,
    limit: number,
    status?: string
  ): Promise<AdminListResponse<Feedback>> {
    await new Promise((r) => setTimeout(r, 400))
    const all = JSON.parse(storage.getItem('mock_feedback_db') || '[]')
    let filtered = all
    if (status && status !== 'all') {
      filtered = all.filter((f: any) => f.status === status)
    }
    filtered.sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    return { data: filtered.slice(offset, offset + limit), total: filtered.length }
  }

  async getWaitlist(offset: number, limit: number): Promise<AdminListResponse<Lenser>> {
    await new Promise((r) => setTimeout(r, 400))
    const allLensers = JSON.parse(storage.getItem('mock_lensers_index') || '[]')
    const waitlisted = allLensers.filter((l: Lenser) => l.is_in_waiting_list)
    waitlisted.sort(
      (a: Lenser, b: Lenser) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    return { data: waitlisted.slice(offset, offset + limit), total: waitlisted.length }
  }

  async getContacts(offset: number, limit: number): Promise<AdminListResponse<ContactMessage>> {
    await new Promise((r) => setTimeout(r, 400))
    const all = JSON.parse(storage.getItem('mock_contact_messages') || '[]')
    all.sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    return { data: all.slice(offset, offset + limit), total: all.length }
  }
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
    let queryBuilder = supabase.from('vw_lensers_profile_full').select('*', { count: 'exact' })

    if (query) {
      queryBuilder = queryBuilder.or(`email.ilike.%${query}%,display_name.ilike.%${query}%`)
    }

    const { data, count, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return {
      data: (data as any[]).map((u) => ({
        id: u.user_id,
        email: u.email || 'hidden',
        display_name: u.display_name,
        created_at: u.created_at,
        last_sign_in_at: u.updated_at, // Use updated_at as proxy for last_sign_in if not available on lensers table
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
      .from('vw_lensers_profile_full')
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
