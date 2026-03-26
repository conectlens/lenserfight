import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@lenserfight/data/supabase'
import { battlesService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'
import type { GlobalMessageRecord } from '@lenserfight/data/repositories'

const MAX_MESSAGES = 200

export type RealtimeStatus = 'connecting' | 'live' | 'error'

export const useGlobalChat = (battleId?: string) => {
  const queryClient = useQueryClient()
  const queryKey = battleId ? queryKeys.battles.globalChat(battleId) : null
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting')

  const query = useQuery({
    queryKey: queryKey ?? ['noop'],
    queryFn: () => battlesService.getGlobalMessages(battleId!),
    enabled: !!battleId,
    staleTime: 0,
  })

  useEffect(() => {
    if (!battleId || !queryKey) return

    setRealtimeStatus('connecting')

    const channel = supabase
      .channel(`battle-global-chat-${battleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'battles',
          table: 'global_messages',
          filter: `battle_id=eq.${battleId}`,
        },
        (payload) => {
          queryClient.setQueryData<GlobalMessageRecord[]>(queryKey, (prev = []) => {
            const next = [...prev, payload.new as GlobalMessageRecord]
            return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next
          })
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('live')
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRealtimeStatus('error')
        else if (status === 'CLOSED') setRealtimeStatus('connecting')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [battleId, queryClient])

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
    realtimeStatus,
  }
}

export const usePostGlobalMessage = (battleId?: string) => {
  return useMutation({
    mutationFn: ({
      senderId,
      senderHandle,
      senderRole,
      body,
    }: {
      senderId: string
      senderHandle: string
      senderRole: string
      body: string
    }) => battlesService.postGlobalMessage(battleId!, senderId, senderHandle, senderRole, body),
    // No onSuccess cache-append — the realtime INSERT subscription is the single source of truth.
    // Adding the message here too causes duplicate keys when the subscription fires for the sender's own row.
  })
}
