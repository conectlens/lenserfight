import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@lenserfight/data/supabase'
import { battlesService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'
import type { GlobalMessageRecord, ChatCursor } from '@lenserfight/data/repositories'

const MAX_MESSAGES = 200
const PAGE_SIZE = 50

export type RealtimeStatus = 'connecting' | 'live' | 'error'

export const useLenserChat = (battleId?: string) => {
  const queryClient = useQueryClient()
  const queryKey = battleId ? queryKeys.battles.globalChat(battleId) : null
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting')

  // Older pages prepended when user clicks "Load earlier"
  const [olderPages, setOlderPages] = useState<GlobalMessageRecord[][]>([])
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Initial page + realtime tail via React Query
  const query = useQuery({
    queryKey: queryKey ?? ['noop'],
    queryFn: () => battlesService.getGlobalMessages(battleId!, PAGE_SIZE),
    enabled: !!battleId,
    staleTime: 0,
  })

  // Derive hasMore once the initial page resolves
  useEffect(() => {
    if (query.data) {
      setHasMore(query.data.length >= PAGE_SIZE)
    }
  }, [query.data])

  // Reset older pages when battleId changes
  useEffect(() => {
    setOlderPages([])
    setHasMore(false)
  }, [battleId])

  const loadMore = useCallback(async () => {
    if (!battleId || isLoadingMore) return

    // Oldest item across all currently displayed messages
    const allCurrent = [...olderPages.flat(), ...(query.data ?? [])]
    const oldest = allCurrent[0]
    if (!oldest) return

    const cursor: ChatCursor = { before_ts: oldest.created_at, before_id: oldest.id }

    setIsLoadingMore(true)
    try {
      const page = await battlesService.getGlobalMessages(battleId, PAGE_SIZE, cursor)
      if (page.length > 0) {
        setOlderPages((prev) => [page, ...prev])
      }
      setHasMore(page.length >= PAGE_SIZE)
    } finally {
      setIsLoadingMore(false)
    }
  }, [battleId, isLoadingMore, olderPages, query.data])

  // Realtime subscription — appends to the React Query live tail (MAX_MESSAGES cap)
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

  // All messages: older pages first, then the live tail
  const messages = [...olderPages.flat(), ...(query.data ?? [])]

  return {
    messages,
    isLoading: query.isLoading,
    realtimeStatus,
    hasMore,
    isLoadingMore,
    loadMore,
  }
}

export const usePostLenserMessage = (battleId?: string) => {
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

// Scroll-anchor hook: prevents viewport from jumping when content is prepended
export const useChatScrollAnchor = (dep: unknown) => {
  const ref = useRef<HTMLDivElement>(null)
  const prevScrollHeight = useRef<number>(0)
  const isPrepending = useRef(false)

  const captureScrollHeight = useCallback(() => {
    if (ref.current) {
      prevScrollHeight.current = ref.current.scrollHeight
      isPrepending.current = true
    }
  }, [])

  useLayoutEffect(() => {
    if (!isPrepending.current || !ref.current) return
    const diff = ref.current.scrollHeight - prevScrollHeight.current
    if (diff > 0) {
      ref.current.scrollTop += diff
    }
    isPrepending.current = false
  }, [dep])

  return { ref, captureScrollHeight }
}
