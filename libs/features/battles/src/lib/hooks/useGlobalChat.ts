import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@lenserfight/data/supabase'
import { battlesService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'
import type { GlobalMessageRecord } from '@lenserfight/data/repositories'

export const useGlobalChat = (battleId?: string) => {
  const queryClient = useQueryClient()
  const queryKey = battleId ? queryKeys.battles.globalChat(battleId) : null

  const query = useQuery({
    queryKey: queryKey ?? ['noop'],
    queryFn: () => battlesService.getGlobalMessages(battleId!),
    enabled: !!battleId,
    staleTime: 0,
  })

  useEffect(() => {
    if (!battleId || !queryKey) return

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
          queryClient.setQueryData<GlobalMessageRecord[]>(queryKey, (prev = []) => [
            ...prev,
            payload.new as GlobalMessageRecord,
          ])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [battleId, queryClient])

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
  }
}

export const usePostGlobalMessage = (battleId?: string) => {
  const queryClient = useQueryClient()

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
    onSuccess: (msg) => {
      if (!battleId) return
      queryClient.setQueryData<GlobalMessageRecord[]>(
        queryKeys.battles.globalChat(battleId),
        (prev = []) => [...prev, msg]
      )
    },
  })
}
