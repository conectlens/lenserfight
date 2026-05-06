import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@lenserfight/data/supabase'
import { notificationsRepository } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'

const QUERY_KEY = ['notifications', 'unread-count'] as const

export function useUnreadCount(): number {
  const { user } = useAuth()
  const qc = useQueryClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const { data = 0 } = useQuery({
    queryKey: QUERY_KEY,
    queryFn:  () => notificationsRepository.getUnreadCount(),
    enabled:  !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  // Invalidate when a new notification arrives (reuse the postgres_changes event)
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`unread-count:${user.id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `lenser_id=eq.${user.id}`,
        },
        () => { qc.invalidateQueries({ queryKey: QUERY_KEY }) },
      )
      .subscribe()

    channelRef.current = channel
    return () => { channel.unsubscribe() }
  }, [user, qc])

  return data as number
}
