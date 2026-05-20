/**
 * useBattleLiveSubmission — spectator Realtime hook.
 *
 * Subscribes to Supabase postgres_changes on battles.submissions
 * to receive incremental content_text updates during live execution.
 * Used by non-executor users watching the battle.
 */
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@lenserfight/data/supabase'

import type { Contender } from '../../types/battle.types'

interface LiveSubmissionState {
  liveOutputA: string
  liveOutputB: string
  isStreamingA: boolean
  isStreamingB: boolean
  statusA: string
  statusB: string
}

export function useBattleLiveSubmission(
  battleId: string | undefined,
  contenderA: Contender | undefined,
  contenderB: Contender | undefined,
  enabled: boolean = true,
): LiveSubmissionState {
  const [state, setState] = useState<LiveSubmissionState>({
    liveOutputA: '',
    liveOutputB: '',
    isStreamingA: false,
    isStreamingB: false,
    statusA: '',
    statusB: '',
  })

  const contenderAIdRef = useRef(contenderA?.id)
  const contenderBIdRef = useRef(contenderB?.id)
  contenderAIdRef.current = contenderA?.id
  contenderBIdRef.current = contenderB?.id

  useEffect(() => {
    if (!battleId || !enabled) return

    const channel = supabase
      .channel(`battle-live-submissions:${battleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'battles',
          table: 'submissions',
          filter: `battle_id=eq.${battleId}`,
        },
        (payload) => {
          const row = payload.new as {
            contender_id?: string
            content_text?: string | null
            status?: string
          }
          if (!row.contender_id) return

          const isA = row.contender_id === contenderAIdRef.current
          const isB = row.contender_id === contenderBIdRef.current
          if (!isA && !isB) return

          const content = row.content_text ?? ''
          const isStreaming = row.status === 'streaming'

          setState((prev) => ({
            ...prev,
            ...(isA
              ? { liveOutputA: content, isStreamingA: isStreaming, statusA: row.status ?? '' }
              : { liveOutputB: content, isStreamingB: isStreaming, statusB: row.status ?? '' }),
          }))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [battleId, enabled])

  return state
}
