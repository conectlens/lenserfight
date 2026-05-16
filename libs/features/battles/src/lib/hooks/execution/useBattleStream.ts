/**
 * useBattleStream — streams a single AI contender's execution.
 *
 * Battle-specific counterpart to useLabController's triggerStream.
 * Reuses the same underlying transport:
 *   - user_byok_local  → streamLocalProvider()
 *   - user_byok_cloud  → walletApiClient.streamWithByok()
 *   - platform_credit  → walletApiClient.streamWithWallet()
 *
 * Additionally records StreamEvent[] for post-execution replay.
 */
import { useCallback, useRef, useState } from 'react'
import { walletApiClient, battleExecutionService } from '@lenserfight/data/repositories'
import { streamLocalProvider } from '@lenserfight/features/lenses'
import type { StreamCallbacks } from '@lenserfight/types'

import type {
  ContenderStreamState,
  ContenderStreamSnapshot,
  ContenderExecutionConfig,
  StreamEvent,
} from '../../types/battle-execution.types'
import { createEmptySnapshot } from '../../types/battle-execution.types'

interface UseBattleStreamOptions {
  resolveLocalKey?: (id: string) => Promise<string>
}

export interface UseBattleStreamReturn {
  snapshot: ContenderStreamSnapshot
  events: StreamEvent[]
  start: (config: ContenderExecutionConfig) => Promise<void>
  abort: () => void
}

export function useBattleStream(options: UseBattleStreamOptions = {}): UseBattleStreamReturn {
  const [snapshot, setSnapshot] = useState<ContenderStreamSnapshot>(
    createEmptySnapshot('', 'A'),
  )
  const abortRef = useRef<AbortController | null>(null)
  const eventsRef = useRef<StreamEvent[]>([])
  const outputRef = useRef('')
  const startTimeRef = useRef<number>(0)
  const tokenCountRef = useRef(0)

  // Flush accumulated text to DB periodically
  const lastFlushRef = useRef(0)
  const FLUSH_INTERVAL_MS = 500

  const flushToDb = useCallback((submissionId: string | null, text: string) => {
    const now = Date.now()
    if (!submissionId || now - lastFlushRef.current < FLUSH_INTERVAL_MS) return
    lastFlushRef.current = now
    battleExecutionService
      .updateSubmissionText(submissionId, text, 'streaming')
      .catch(() => {}) // best-effort
  }, [])

  const abort = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const start = useCallback(
    async (config: ContenderExecutionConfig) => {
      // Reset state
      abort()
      const controller = new AbortController()
      abortRef.current = controller
      const isActive = () => abortRef.current === controller
      const startedAt = Date.now()
      startTimeRef.current = startedAt
      outputRef.current = ''
      eventsRef.current = []
      tokenCountRef.current = 0
      lastFlushRef.current = 0

      const baseSnapshot: ContenderStreamSnapshot = {
        ...createEmptySnapshot(config.contenderId, config.slot),
        state: 'loading',
        startedAt,
      }
      setSnapshot(baseSnapshot)

      // Create pending submission
      let submissionId: string | null = null
      try {
        const sub = await battleExecutionService.createSubmission(
          config.lensId, // We'll pass battle_id from the orchestrator
          config.contenderId,
          'streaming',
        )
        submissionId = sub.id
        if (!isActive()) return
        setSnapshot((s) => ({ ...s, submissionId }))
      } catch {
        // Will be handled by the orchestrator
      }

      const callbacks: StreamCallbacks = {
        onStart: (runId: string) => {
          if (!isActive()) return
          eventsRef.current.push({ t: Date.now() - startedAt, k: 's', m: { runId } })
          setSnapshot((s) => ({ ...s, state: 'streaming', runId }))
        },
        onToken: (content: string) => {
          if (!isActive()) return
          const t = Date.now() - startedAt
          eventsRef.current.push({ t, k: 't', d: content })
          tokenCountRef.current++
          // Collapse runs of 10+ spaces
          const cleaned = content.replace(/ {10,}/g, ' ')
          outputRef.current += cleaned
          setSnapshot((s) => ({ ...s, output: outputRef.current }))
          flushToDb(submissionId, outputRef.current)
        },
        onEnd: (usage, credits) => {
          if (!isActive()) return
          const completedAt = Date.now()
          eventsRef.current.push({
            t: completedAt - startedAt,
            k: 'e',
            m: { usage, credits },
          })
          setSnapshot((s) => ({
            ...s,
            state: 'complete',
            usage,
            creditsCharged: credits,
            completedAt,
          }))
          // Final flush
          if (submissionId) {
            battleExecutionService
              .updateSubmissionText(submissionId, outputRef.current, 'submitted')
              .catch(() => {})
          }
        },
        onError: (message: string) => {
          if (!isActive()) return
          eventsRef.current.push({
            t: Date.now() - startedAt,
            k: 'x',
            m: { message },
          })
          setSnapshot((s) => ({
            ...s,
            state: 'error',
            error: message,
            completedAt: Date.now(),
          }))
        },
      }

      // Route to correct stream transport
      const messages = [{ role: 'user' as const, content: config.lensContent }]
      try {
        if (
          config.fundingSource === 'user_byok_local' &&
          config.byokLocalKeyId &&
          options.resolveLocalKey
        ) {
          const decryptedKey = await options.resolveLocalKey(config.byokLocalKeyId)
          if (!isActive()) return
          await streamLocalProvider({
            provider: config.providerKey,
            model: config.modelKey,
            messages,
            decryptedKey,
            signal: controller.signal,
            callbacks,
          })
        } else if (config.fundingSource === 'user_byok_cloud' && config.byokKeyRefId) {
          if (import.meta.env.DEV) {
            // Local dev: resolve cloud vault key client-side, stream directly to provider.
            // This branch is tree-shaken away in production builds (Vite replaces DEV=false).
            const decryptedKey = await walletApiClient.resolveByokKeyForLocalDev(config.byokKeyRefId)
            if (!isActive()) return
            await streamLocalProvider({
              provider: config.providerKey,
              model: config.modelKey,
              messages,
              decryptedKey,
              signal: controller.signal,
              callbacks,
            })
          } else {
            await walletApiClient.streamWithByok(
              {
                key_ref_id: config.byokKeyRefId,
                provider: config.providerKey as 'openai' | 'anthropic' | 'google',
                model: config.modelKey,
                messages,
              },
              controller.signal,
              callbacks,
            )
          }
        } else {
          await walletApiClient.streamWithWallet(
            {
              provider: config.providerKey as 'openai' | 'anthropic' | 'google',
              model: config.modelKey,
              messages,
            },
            controller.signal,
            callbacks,
          )
        }
      } catch (err: unknown) {
        if (!isActive()) return
        if ((err as Error).name === 'AbortError') {
          setSnapshot((s) => ({ ...s, state: 'idle' }))
        } else {
          setSnapshot((s) => ({
            ...s,
            state: 'error',
            error: (err as Error).message,
            completedAt: Date.now(),
          }))
        }
      }
    },
    [abort, flushToDb, options],
  )

  return {
    snapshot,
    events: eventsRef.current,
    start,
    abort,
  }
}
