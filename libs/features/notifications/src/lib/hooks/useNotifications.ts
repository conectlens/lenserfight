import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@lenserfight/data/supabase'
import { notificationsRepository } from '@lenserfight/data/repositories'
import type { NotificationRecord } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'

const QUERY_KEY = ['notifications']
const UNREAD_COUNT_QUERY_KEY = ['notifications', 'unread-count']

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
  // Derive from the loaded list so the badge always matches what the user sees
  // in the Unread tab. The DB-returned unread_count counts rows beyond LIMIT
  // and can drift from the rendered list after optimistic updates.
  const unreadCount = notifications.reduce((acc, n) => acc + (n.read_at ? 0 : 1), 0)

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
          // Prepend the new notification to the cached list, deduped by id.
          qc.setQueryData<NotificationRecord[]>(QUERY_KEY, (prev) => {
            const incoming = payload.new as NotificationRecord
            const existing = prev ?? []
            if (existing.some((n) => n.id === incoming.id)) return existing
            return [incoming, ...existing]
          })
          qc.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY })
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
      const readAt = new Date().toISOString()
      qc.setQueryData<NotificationRecord[]>(QUERY_KEY, (prev) =>
        (prev ?? []).map((n) =>
          ids.includes(n.id) && !n.read_at ? { ...n, read_at: readAt } : n
        )
      )
      qc.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY })
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
