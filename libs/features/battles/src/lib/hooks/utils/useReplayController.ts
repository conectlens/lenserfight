/**
 * useReplayController — plays back a recorded stream at original timing.
 *
 * GRASP: Controller (Pure Fabrication) — handles playback orchestration
 * with play, pause, seek, speed controls. Zero coupling to live streaming.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import type { StreamRecording, StreamEvent } from '../../types/battle-execution.types'

export type ReplayState = 'idle' | 'playing' | 'paused' | 'complete'

interface UseReplayControllerOptions {
  recording: StreamRecording | null
  autoPlay?: boolean
  playbackSpeed?: number
  autoLoop?: boolean
  loopDelayMs?: number
}

export interface UseReplayControllerReturn {
  output: string
  state: ReplayState
  progress: number
  positionMs: number
  durationMs: number
  speed: number
  play: () => void
  pause: () => void
  seek: (positionMs: number) => void
  setSpeed: (speed: number) => void
  restart: () => void
}

function buildOutputAtPosition(events: StreamEvent[], positionMs: number): string {
  let output = ''
  for (const event of events) {
    if (event.t > positionMs) break
    if (event.k === 't' && event.d) output += event.d
  }
  return output
}

export function useReplayController(
  options: UseReplayControllerOptions,
): UseReplayControllerReturn {
  const { recording, autoPlay = false, playbackSpeed = 1, autoLoop = true, loopDelayMs = 3000 } = options

  const [state, setState] = useState<ReplayState>('idle')
  const [output, setOutput] = useState('')
  const [positionMs, setPositionMs] = useState(0)
  const [speed, setSpeedState] = useState(playbackSpeed)

  const rafRef = useRef<number | null>(null)
  const lastFrameRef = useRef<number>(0)
  const eventIndexRef = useRef(0)
  const outputRef = useRef('')
  const positionRef = useRef(0)
  const speedRef = useRef(speed)
  speedRef.current = speed

  const durationMs = recording?.totalDurationMs ?? 0
  const events = recording?.events ?? []
  const progress = durationMs > 0 ? Math.min(positionRef.current / durationMs, 1) : 0

  const cancelRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const tick = useCallback(
    (timestamp: number) => {
      if (!events.length) return

      const delta = (timestamp - lastFrameRef.current) * speedRef.current
      lastFrameRef.current = timestamp
      positionRef.current += delta

      // Process events up to current position
      let updated = false
      while (eventIndexRef.current < events.length) {
        const event = events[eventIndexRef.current]
        if (event.t > positionRef.current) break
        if (event.k === 't' && event.d) {
          outputRef.current += event.d
          updated = true
        }
        eventIndexRef.current++
      }

      if (updated) setOutput(outputRef.current)
      setPositionMs(positionRef.current)

      // Check completion
      if (eventIndexRef.current >= events.length) {
        setState('complete')
        cancelRaf()

        // Auto-loop for voting phase
        if (autoLoop) {
          setTimeout(() => {
            // Restart if still mounted and complete
            outputRef.current = ''
            eventIndexRef.current = 0
            positionRef.current = 0
            setOutput('')
            setPositionMs(0)
            setState('playing')
            lastFrameRef.current = performance.now()
            rafRef.current = requestAnimationFrame(tick)
          }, loopDelayMs)
        }
        return
      }

      rafRef.current = requestAnimationFrame(tick)
    },
    [events, cancelRaf, autoLoop, loopDelayMs],
  )

  const play = useCallback(() => {
    if (!events.length) return
    setState('playing')
    lastFrameRef.current = performance.now()
    rafRef.current = requestAnimationFrame(tick)
  }, [events, tick])

  const pause = useCallback(() => {
    cancelRaf()
    setState('paused')
  }, [cancelRaf])

  const seek = useCallback(
    (targetMs: number) => {
      positionRef.current = Math.max(0, Math.min(targetMs, durationMs))
      outputRef.current = buildOutputAtPosition(events, positionRef.current)
      // Find the event index for the position
      eventIndexRef.current = events.findIndex((e) => e.t > positionRef.current)
      if (eventIndexRef.current === -1) eventIndexRef.current = events.length
      setOutput(outputRef.current)
      setPositionMs(positionRef.current)
    },
    [events, durationMs],
  )

  const setSpeed = useCallback((newSpeed: number) => {
    setSpeedState(newSpeed)
  }, [])

  const restart = useCallback(() => {
    cancelRaf()
    outputRef.current = ''
    eventIndexRef.current = 0
    positionRef.current = 0
    setOutput('')
    setPositionMs(0)
    play()
  }, [cancelRaf, play])

  // Auto-play on mount
  useEffect(() => {
    if (autoPlay && recording && events.length > 0 && state === 'idle') {
      play()
    }
  }, [autoPlay, recording, events.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup
  useEffect(() => cancelRaf, [cancelRaf])

  // Reset when recording changes
  useEffect(() => {
    cancelRaf()
    outputRef.current = ''
    eventIndexRef.current = 0
    positionRef.current = 0
    setOutput('')
    setPositionMs(0)
    setState('idle')
  }, [recording, cancelRaf])

  return {
    output,
    state,
    progress,
    positionMs: positionRef.current,
    durationMs,
    speed,
    play,
    pause,
    seek,
    setSpeed,
    restart,
  }
}
