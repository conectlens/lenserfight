import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@lenserfight/data/supabase'
import { notificationsRepository } from '@lenserfight/data/repositories'
import type { NotificationRecord } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'

const QUERY_KEY = ['notifications']

export function useNotifications(limit = 20) {
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => notificationsRepository.getNotifications(limit),
    enabled: !!user,
    staleTime: 60_000,
  })

  const notifications = data ?? []
  const unreadCount = notifications[0]?.unread_count ?? 0

  // Realtime subscription — listen for INSERT on our own notifications
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `lenser_id=eq.${user.id}`,
        },
        (payload) => {
          // Prepend the new notification to the cached list
          qc.setQueryData<NotificationRecord[]>(QUERY_KEY, (prev) => {
            const incoming = payload.new as NotificationRecord
            // unread_count on the incoming row may be stale; increment ours
            const prevUnread = prev?.[0]?.unread_count ?? 0
            const enriched: NotificationRecord = {
              ...incoming,
              unread_count: prevUnread + 1,
            }
            return [enriched, ...(prev ?? []).map((n) => ({ ...n, unread_count: prevUnread + 1 }))]
          })
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => { channel.unsubscribe() }
  }, [user, qc])

  const markRead = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return
      await notificationsRepository.markRead(ids)
      qc.setQueryData<NotificationRecord[]>(QUERY_KEY, (prev) =>
        (prev ?? []).map((n) =>
          ids.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n
        )
      )
      // Recalculate unread_count
      qc.setQueryData<NotificationRecord[]>(QUERY_KEY, (prev) => {
        if (!prev) return prev
        const newUnread = prev.filter((n) => !n.read_at).length
        return prev.map((n) => ({ ...n, unread_count: newUnread }))
      })
    },
    [qc]
  )

  const markAllRead = useCallback(async () => {
    const ids = notifications.filter((n) => !n.read_at).map((n) => n.id)
    await markRead(ids)
  }, [notifications, markRead])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markRead,
    markAllRead,
  }
}
