import { supabase } from '@lenserfight/data/supabase'
import type { NotificationRow } from '@lenserfight/types'

// Backward-compat alias — existing consumers (useNotifications, useNotificationToast, NotificationsPage) use NotificationRecord
export type NotificationRecord = NotificationRow

export interface NotificationsRepositoryPort {
  getNotifications(limit?: number, cursor?: string): Promise<NotificationRecord[]>
  markRead(ids: string[]): Promise<number>
  getUnreadCount(): Promise<number>
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

  async getUnreadCount(): Promise<number> {
    const { data, error } = await supabase.rpc('fn_get_unread_notification_count')
    if (error) throw error
    return (data as number) ?? 0
  }
}

export const notificationsRepository = new SupabaseNotificationsRepository()
