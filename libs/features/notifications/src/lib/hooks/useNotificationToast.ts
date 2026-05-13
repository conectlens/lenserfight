import { useEffect, useRef } from 'react'
import { supabase } from '@lenserfight/data/supabase'
import { toast } from 'sonner'
import { useAuth } from '@lenserfight/features/auth'
import type { NotificationRecord } from '@lenserfight/data/repositories'
import type { NotificationType } from '@lenserfight/types'

type ToastFn = (message: Parameters<typeof toast>[0], data?: Parameters<typeof toast>[1]) => string | number

// Strategy map: only listed types produce a toast. Absent types are intentionally silent.
const TOAST_CONFIG: Partial<Record<NotificationType, {
  label: string
  duration: number
  fn: ToastFn
}>> = {
  // Battle
  battle_result:       { label: 'View Results',   duration: 8000,  fn: toast },
  battle_started:      { label: 'View Battle',    duration: 6000,  fn: toast },
  battle_joined:       { label: 'View Battle',    duration: 5000,  fn: toast },
  battle_won:          { label: 'View Results',   duration: 8000,  fn: toast.success },
  battle_lost:         { label: 'View Results',   duration: 5000,  fn: toast },
  battle_comment:      { label: 'View Battle',    duration: 4000,  fn: toast },
  vote_received:       { label: 'View Battle',    duration: 4000,  fn: toast },
  // Social
  follow_new:          { label: 'View Profile',   duration: 5000,  fn: toast },
  follow_request:      { label: 'Review',         duration: 7000,  fn: toast },
  follow_accepted:     { label: 'View Profile',   duration: 5000,  fn: toast },
  // Content
  lens_comment:        { label: 'View Thread',    duration: 5000,  fn: toast },
  lens_published:      { label: 'View Lens',      duration: 5000,  fn: toast },
  lens_forked:         { label: 'View Fork',      duration: 5000,  fn: toast },
  lens_featured:       { label: 'View Lens',      duration: 8000,  fn: toast.success },
  workflow_published:  { label: 'View Workflow',  duration: 5000,  fn: toast },
  workflow_forked:     { label: 'View Fork',      duration: 5000,  fn: toast },
  // Agent
  agent_created:       { label: 'View Agent',     duration: 6000,  fn: toast.success },
  agent_battle_won:    { label: 'View Results',   duration: 8000,  fn: toast.success },
  agent_critical:      { label: 'View Run',       duration: 10000, fn: toast.error },
  team_run_failed:     { label: 'View Run',       duration: 8000,  fn: toast.error },
  team_run_completed:  { label: 'View Run',       duration: 4000,  fn: toast.success },
  cron_run_failed:     { label: 'View Workflow',  duration: 8000,  fn: toast.error },
  cron_run_completed:  { label: 'View Workflow',  duration: 4000,  fn: toast.success },
  // System
  badge_awarded:       { label: 'View Badge',     duration: 8000,  fn: toast.success },
  policy_updated:      { label: 'View Policy',    duration: 5000,  fn: toast },
}

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
          const config = TOAST_CONFIG[notification.type as NotificationType]
          if (!config) return

          config.fn(notification.title, {
            description: notification.body ?? undefined,
            action: notification.action_url
              ? { label: config.label, onClick: () => { window.location.href = notification.action_url! } }
              : undefined,
            duration: config.duration,
          })
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => { channel.unsubscribe() }
  }, [user])
}
