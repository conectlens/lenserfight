import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@lenserfight/data/supabase'

export type CliStreamState = 'idle' | 'streaming' | 'complete' | 'error'

export interface UseBattleCliStreamReturn {
  output: string
  state: CliStreamState
  tokenCount: number
  reset: () => void
}

/**
 * Subscribes to Supabase Realtime Broadcast channel emitted by `lf battle exec --stream-to-web`.
 * Channel: battle-cli-stream-{battleId}-{slot}
 * Events: token | end | error
 *
 * Designed to be merged into BattleLiveArena when no local browser execution is running.
 */
export function useBattleCliStream(
  battleId: string | undefined,
  slot: 'A' | 'B',
): UseBattleCliStreamReturn {
  const [output, setOutput] = useState('')
  const [state, setState] = useState<CliStreamState>('idle')
  const [tokenCount, setTokenCount] = useState(0)
  const outputRef = useRef('')

  const reset = useCallback(() => {
    outputRef.current = ''
    setOutput('')
    setState('idle')
    setTokenCount(0)
  }, [])

  useEffect(() => {
    if (!battleId) return

    const channelName = `battle-cli-stream-${battleId}-${slot}`
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'token' }, ({ payload }) => {
        const delta = String(payload?.delta ?? '')
        if (!delta) return
        outputRef.current += delta
        setOutput(outputRef.current)
        setTokenCount((n) => n + 1)
        setState('streaming')
      })
      .on('broadcast', { event: 'end' }, () => {
        setState('complete')
      })
      .on('broadcast', { event: 'error' }, () => {
        setState('error')
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [battleId, slot])

  return { output, state, tokenCount, reset }
}
