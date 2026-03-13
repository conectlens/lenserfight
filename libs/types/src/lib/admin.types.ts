export interface AdminAnalyticsData {
  registrations: { date: string; count: number }[]
  threads: { date: string; count: number }[]
  pageViews: { date: string; count: number }[]
}

export interface AdminUser {
  id: string
  email: string
  display_name: string
  created_at: string
  last_sign_in_at?: string
  is_super_admin?: boolean
}

export interface AdminListResponse<T> {
  data: T[]
  total: number
}

export interface AdminFilters {
  search?: string
  status?: string
  dateRange?: { start: string; end: string }
}
