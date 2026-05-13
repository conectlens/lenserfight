/**
 * useBattleExecution — orchestrates two simultaneous AI contender streams.
 *
 * Flow:
 *  1. preFlight  — fetch configs, resolve lens content, validate, transition to 'executing'
 *  2. execute    — start both streams simultaneously
 *  3. finalize   — when both complete, mark submissions as 'submitted', transition to 'voting'
 *  4. abort      — stop both streams, log cancellation
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { lensesService, battleExecutionService } from '@lenserfight/data/repositories'
import { renderLensWithSnapshot } from '@lenserfight/utils/text'

import type {
  BattleExecutionPhase,
  BattleExecutionState,
  ContenderExecutionConfig,
  ContenderStreamSnapshot,
} from '../../types/battle-execution.types'
import { createEmptySnapshot } from '../../types/battle-execution.types'
import { useBattleStream } from './useBattleStream'

import type { Contender, Battle, ContenderLensAssignmentRecord } from '../../types/battle.types'

interface UseBattleExecutionOptions {
  battle: Battle | null | undefined
  contenderA: Contender | undefined
  contenderB: Contender | undefined
  lensAssignments: ContenderLensAssignmentRecord[]
  currentUserId?: string
  resolveLocalKey?: (id: string) => Promise<string>
}

export interface UseBattleExecutionReturn {
  executionState: BattleExecutionState
  startExecution: () => Promise<void>
  abortExecution: () => void
  canStart: boolean
  isExecuting: boolean
  isComplete: boolean
}

function createInitialState(battleId: string): BattleExecutionState {
  return {
    phase: 'pre_flight',
    contenderA: createEmptySnapshot('', 'A'),
    contenderB: createEmptySnapshot('', 'B'),
    battleId,
    startedAt: null,
  }
}

export function useBattleExecution(options: UseBattleExecutionOptions): UseBattleExecutionReturn {
  const { battle, contenderA, contenderB, lensAssignments, currentUserId } = options

  const [phase, setPhase] = useState<BattleExecutionPhase>('pre_flight')
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  const streamA = useBattleStream({ resolveLocalKey: options.resolveLocalKey })
  const streamB = useBattleStream({ resolveLocalKey: options.resolveLocalKey })

  const canStart =
    !!battle &&
    battle.status === 'open' &&
    !!contenderA &&
    !!contenderB &&
    !!currentUserId &&
    currentUserId === battle.creator_lenser_id

  const isExecuting = phase === 'executing'
  const isComplete = phase === 'complete'

  // Watch for both streams completing
  useEffect(() => {
    if (phaseRef.current !== 'executing') return
    const stateA = streamA.snapshot.state
    const stateB = streamB.snapshot.state

    const isDoneA = stateA === 'complete' || stateA === 'error'
    const isDoneB = stateB === 'complete' || stateB === 'error'

    if (isDoneA && isDoneB) {
      finalize()
    }
  }, [streamA.snapshot.state, streamB.snapshot.state])

  const finalize = useCallback(async () => {
    if (!battle) return
    setPhase('finalizing')
    try {
      // Log events
      await battleExecutionService.insertBattleEvent(
        battle.id,
        'execution_completed',
        currentUserId,
        {
          contenderA: {
            state: streamA.snapshot.state,
            tokens: streamA.snapshot.usage?.output_tokens ?? 0,
          },
          contenderB: {
            state: streamB.snapshot.state,
            tokens: streamB.snapshot.usage?.output_tokens ?? 0,
          },
        },
      )

      // Save stream recordings for replay
      if (contenderA && streamA.events.length > 0) {
        const lastEvent = streamA.events[streamA.events.length - 1]
        await battleExecutionService.saveStreamRecording(
          battle.id,
          contenderA.id,
          'A',
          streamA.events,
          lastEvent?.t ?? 0,
          streamA.events.filter((e) => e.k === 't').length,
          streamA.snapshot.output,
        )
      }
      if (contenderB && streamB.events.length > 0) {
        const lastEvent = streamB.events[streamB.events.length - 1]
        await battleExecutionService.saveStreamRecording(
          battle.id,
          contenderB.id,
          'B',
          streamB.events,
          lastEvent?.t ?? 0,
          streamB.events.filter((e) => e.k === 't').length,
          streamB.snapshot.output,
        )
      }

      // Transition battle to voting
      await battleExecutionService.transitionBattleStatus(battle.id, 'voting')
      setPhase('complete')
    } catch {
      setPhase('failed')
    }
  }, [battle, contenderA, contenderB, currentUserId, streamA, streamB])

  const startExecution = useCallback(async () => {
    if (!battle || !contenderA || !contenderB || !currentUserId) return

    setPhase('pre_flight')

    try {
      // 1. Fetch execution configs
      const [configA, configB] = await Promise.all([
        battleExecutionService.getExecutionConfig(battle.id, contenderA.id),
        battleExecutionService.getExecutionConfig(battle.id, contenderB.id),
      ])

      if (!configA || !configB) {
        throw new Error('Execution config not found for one or both contenders')
      }

      // 2. Resolve lens content from assignments
      const assignA = lensAssignments.find((a) => a.contender_id === contenderA.id)
      const assignB = lensAssignments.find((a) => a.contender_id === contenderB.id)

      if (!assignA || !assignB) {
        throw new Error('Lens assignment not found for one or both contenders')
      }

      const [versionA, versionB] = await Promise.all([
        assignA.version_id
          ? lensesService.getVersionById(assignA.version_id)
          : lensesService.getLatestPublishedVersion(assignA.lens_id),
        assignB.version_id
          ? lensesService.getVersionById(assignB.version_id)
          : lensesService.getLatestPublishedVersion(assignB.lens_id),
      ])

      if (!versionA?.templateBody || !versionB?.templateBody) {
        throw new Error('Could not resolve lens content for contenders')
      }

      // 3. Substitute [[param]] tokens using the stored input snapshots.
      //    Validate that all required parameters have values before execution.
      const paramsA = (versionA.parameters ?? []) as import('@lenserfight/types').LensVersionParam[]
      const paramsB = (versionB.parameters ?? []) as import('@lenserfight/types').LensVersionParam[]

      const missingA = paramsA
        .filter((p) => p.tool?.required)
        .filter((p) => { const v = (assignA.input_snapshot ?? {})[p.label]; return v === undefined || v === null || v === '' })
      const missingB = paramsB
        .filter((p) => p.tool?.required)
        .filter((p) => { const v = (assignB.input_snapshot ?? {})[p.label]; return v === undefined || v === null || v === '' })

      if (missingA.length > 0 || missingB.length > 0) {
        const names = [
          ...missingA.map((p) => `A:${p.label}`),
          ...missingB.map((p) => `B:${p.label}`),
        ]
        throw new Error(`Missing required lens parameters: ${names.join(', ')}`)
      }

      const renderedContentA = renderLensWithSnapshot(
        versionA.templateBody,
        assignA.input_snapshot ?? {},
        paramsA,
      )
      const renderedContentB = renderLensWithSnapshot(
        versionB.templateBody,
        assignB.input_snapshot ?? {},
        paramsB,
      )

      // 4. Transition battle to executing
      await battleExecutionService.transitionBattleStatus(battle.id, 'executing')
      await battleExecutionService.insertBattleEvent(
        battle.id,
        'execution_started',
        currentUserId,
      )

      // 5. Build execution configs
      const execConfigA: ContenderExecutionConfig = {
        contenderId: contenderA.id,
        slot: 'A',
        providerKey: configA.provider_key,
        modelKey: configA.model_key,
        fundingSource: configA.funding_source as ContenderExecutionConfig['fundingSource'],
        byokKeyRefId: configA.byok_key_ref_id,
        lensId: assignA.lens_id,
        lensContent: renderedContentA,
        maxTokens: configA.max_tokens,
      }

      const execConfigB: ContenderExecutionConfig = {
        contenderId: contenderB.id,
        slot: 'B',
        providerKey: configB.provider_key,
        modelKey: configB.model_key,
        fundingSource: configB.funding_source as ContenderExecutionConfig['fundingSource'],
        byokKeyRefId: configB.byok_key_ref_id,
        lensId: assignB.lens_id,
        lensContent: renderedContentB,
        maxTokens: configB.max_tokens,
      }

      // 6. Start both streams simultaneously
      setPhase('executing')
      await Promise.all([streamA.start(execConfigA), streamB.start(execConfigB)])
    } catch (err) {
      setPhase('failed')
      await battleExecutionService.insertBattleEvent(
        battle.id,
        'execution_failed',
        currentUserId,
        { error: (err as Error).message },
      ).catch(() => {})
    }
  }, [battle, contenderA, contenderB, currentUserId, lensAssignments, streamA, streamB])

  const abortExecution = useCallback(() => {
    streamA.abort()
    streamB.abort()
    setPhase('failed')
    if (battle && currentUserId) {
      battleExecutionService
        .insertBattleEvent(battle.id, 'execution_aborted', currentUserId)
        .catch(() => {})
      // Revert to open status
      battleExecutionService
        .transitionBattleStatus(battle.id, 'open')
        .catch(() => {})
    }
  }, [battle, currentUserId, streamA, streamB])

  const executionState: BattleExecutionState = {
    phase,
    contenderA: streamA.snapshot,
    contenderB: streamB.snapshot,
    battleId: battle?.id ?? '',
    startedAt: streamA.snapshot.startedAt,
  }

  return {
    executionState,
    startExecution,
    abortExecution,
    canStart,
    isExecuting,
    isComplete,
  }
}
