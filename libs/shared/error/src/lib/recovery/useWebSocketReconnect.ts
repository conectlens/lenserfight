import { useCallback, useEffect, useRef, useState } from 'react'

export type WebSocketStatus = 'connected' | 'disconnected' | 'reconnecting' | 'failed'

export interface WebSocketReconnectOptions {
  maxReconnectAttempts?: number
  onConnected?: () => void
  onDisconnected?: () => void
}

export interface WebSocketReconnectResult {
  status: WebSocketStatus
  reconnectAttempt: number
  manualReconnect: () => void
}

// Accepts a ref to any Supabase-like channel object that has a `.subscribe()` method
// and emits 'CHANNEL_ERROR' | 'TIMED_OUT' | 'SUBSCRIBED' status strings.
export function useWebSocketReconnect(
  channelRef: React.RefObject<{ subscribe: (cb: (status: string) => void) => unknown } | null>,
  options: WebSocketReconnectOptions = {},
): WebSocketReconnectResult {
  const { maxReconnectAttempts = 5, onConnected, onDisconnected } = options
  const [status, setStatus] = useState<WebSocketStatus>('connected')
  const [reconnectAttempt, setReconnectAttempt] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const attemptReconnect = useCallback(
    (attempt: number) => {
      const channel = channelRef.current
      if (!channel) return

      if (attempt >= maxReconnectAttempts) {
        setStatus('failed')
        return
      }

      setStatus('reconnecting')
      setReconnectAttempt(attempt)

      const delay = Math.min(1000 * Math.pow(2, attempt), 30000)
      timerRef.current = setTimeout(() => {
        channel.subscribe((s) => {
          if (s === 'SUBSCRIBED') {
            setStatus('connected')
            setReconnectAttempt(0)
            onConnected?.()
          } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
            onDisconnected?.()
            attemptReconnect(attempt + 1)
          }
        })
      }, delay)
    },
    [channelRef, maxReconnectAttempts, onConnected, onDisconnected],
  )

  // Watch the channel ref for disconnect signals via its subscribe callback
  useEffect(() => {
    const channel = channelRef.current
    if (!channel) return

    channel.subscribe((s) => {
      if (s === 'SUBSCRIBED') {
        setStatus('connected')
      } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
        setStatus('disconnected')
        onDisconnected?.()
        attemptReconnect(0)
      }
    })

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const manualReconnect = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setReconnectAttempt(0)
    attemptReconnect(0)
  }, [attemptReconnect])

  return { status, reconnectAttempt, manualReconnect }
}
