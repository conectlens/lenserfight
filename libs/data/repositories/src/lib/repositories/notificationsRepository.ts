import { supabase } from '@lenserfight/data/supabase'

export type NotificationType = 'battle_result' | 'battle_started' | 'vote_reminder' | 'badge_awarded' | 'system'

export interface NotificationRecord {
  id: string
  type: NotificationType
  title: string
  body: string | null
  action_url: string | null
  metadata: Record<string, unknown>
  read_at: string | null
  created_at: string
  unread_count: number
}

export interface NotificationsRepositoryPort {
  getNotifications(limit?: number, cursor?: string): Promise<NotificationRecord[]>
  markRead(ids: string[]): Promise<number>
}

export class SupabaseNotificationsRepository implements NotificationsRepositoryPort {
  async getNotifications(limit = 20, cursor?: string): Promise<NotificationRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_notifications', {
      p_limit:  limit,
      p_cursor: cursor ?? null,
    })
    if (error) throw error
    return (data ?? []) as NotificationRecord[]
  }

  async markRead(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0
    const { data, error } = await supabase.rpc('fn_mark_notifications_read', {
      p_notification_ids: ids,
    })
    if (error) throw error
    return (data as number) ?? 0
  }
}

export const notificationsRepository = new SupabaseNotificationsRepository()
