import { queryKeys } from '@lenserfight/data/cache'
import { battlesService } from '@lenserfight/data/repositories'
import type { BattleCommentRecord, ChatCursor } from '@lenserfight/data/repositories'
import { supabase } from '@lenserfight/data/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const PAGE_SIZE = 50

export const useBattleComments = (battleId?: string) => {
  const queryClient = useQueryClient()

  // Initial page via React Query (realtime inserts append to this cache key)
  const query = useQuery<BattleCommentRecord[], Error>({
    queryKey: queryKeys.battles.comments(battleId ?? ''),
    queryFn: () => battlesService.getBattleComments(battleId!, PAGE_SIZE),
    enabled: !!battleId,
    staleTime: 0,
  })

  // Older pages prepended when user clicks "Load earlier"
  const [olderPages, setOlderPages] = useState<BattleCommentRecord[][]>([])
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

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

    // Determine the cursor: oldest item across all currently displayed messages
    const allCurrent = [...olderPages.flat(), ...(query.data ?? [])]
    const oldest = allCurrent[0]
    if (!oldest) return

    const cursor: ChatCursor = { before_ts: oldest.created_at, before_id: oldest.id }

    setIsLoadingMore(true)
    try {
      const page = await battlesService.getBattleComments(battleId, PAGE_SIZE, cursor)
      if (page.length > 0) {
        setOlderPages((prev) => [page, ...prev])
      }
      setHasMore(page.length >= PAGE_SIZE)
    } finally {
      setIsLoadingMore(false)
    }
  }, [battleId, isLoadingMore, olderPages, query.data])

  // Realtime INSERT — append new message to the React Query cache
  useEffect(() => {
    if (!battleId) return

    const channel = supabase
      .channel(`battle-comments-${battleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'battles',
          table: 'comments',
          filter: `battle_id=eq.${battleId}`,
        },
        async (payload) => {
          const raw = payload.new as {
            id: string
            battle_id: string
            lenser_id: string
            body: string
            created_at: string
            updated_at: string
          }

          // Fetch profile inline so we can append a fully-enriched record
          // without a full query refetch (true streaming, one small round trip).
          const { data: profile } = await supabase
            .schema('lensers')
            .from('profiles')
            .select('handle, display_name, avatar_url')
            .eq('id', raw.lenser_id)
            .single()

          const enriched: BattleCommentRecord = {
            id: raw.id,
            battle_id: raw.battle_id,
            lenser_id: raw.lenser_id,
            body: raw.body,
            created_at: raw.created_at,
            updated_at: raw.updated_at,
            lenser_handle: profile?.handle ?? undefined,
            lenser_display_name: profile?.display_name ?? undefined,
            lenser_avatar_url: profile?.avatar_url ?? null,
          }

          queryClient.setQueryData<BattleCommentRecord[]>(
            queryKeys.battles.comments(battleId),
            (prev = []) => {
              // Deduplicate: realtime fires for the sender's own INSERT too
              if (prev.some((c) => c.id === enriched.id)) return prev
              return [...prev, enriched]
            }
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [battleId, queryClient])

  // All comments in chronological order: older pages first, then initial page (+ realtime tail)
  const data = [...olderPages.flat(), ...(query.data ?? [])]

  return {
    data,
    isLoading: query.isLoading,
    hasMore,
    isLoadingMore,
    loadMore,
  }
}

export const usePostComment = (battleId?: string) => {
  return useMutation({
    mutationFn: ({ lenserId, body }: { lenserId: string; body: string }) =>
      battlesService.postComment(battleId!, lenserId, body),
    // No onSuccess invalidation — the realtime INSERT subscription enriches
    // and appends the new comment directly, avoiding a duplicate round trip.
  })
}

// Scroll-anchor hook: prevents viewport from jumping when content is prepended
export const useScrollAnchor = (dep: unknown) => {
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
