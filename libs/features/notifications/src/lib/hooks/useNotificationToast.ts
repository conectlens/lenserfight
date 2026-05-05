import { useEffect, useRef } from 'react'
import { supabase } from '@lenserfight/data/supabase'
import { toast } from 'sonner'
import { useAuth } from '@lenserfight/features/auth'
import type { NotificationRecord } from '@lenserfight/data/repositories'

// Fires a toast when a battle_result notification arrives via Supabase Realtime.
export function useNotificationToast() {
  const { user } = useAuth()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`notification-toast:${user.id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `lenser_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as NotificationRecord
          if (notification.type === 'battle_result') {
            toast(notification.title, {
              description: notification.body ?? undefined,
              action: notification.action_url
                ? { label: 'View Results', onClick: () => { window.location.href = notification.action_url! } }
                : undefined,
              duration: 8000,
            })
          }
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => { channel.unsubscribe() }
  }, [user])
}
