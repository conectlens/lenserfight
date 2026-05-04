import { useMemo, useRef } from 'react'

import type { BattleStatus, BattleUIPhase } from '../../types/battle.types'

const STATUS_TO_PHASE: Record<BattleStatus, BattleUIPhase> = {
  draft: 'idle',
  open: 'idle',
  executing: 'running',
  voting: 'voting',
  scoring: 'running',
  closed: 'result',
  published: 'result',
  archived: 'result',
}

export const useBattleStateMachine = (status?: BattleStatus) => {
  const currentPhase: BattleUIPhase = status
    ? (STATUS_TO_PHASE[status] ?? 'idle')
    : 'idle'

  const prevPhaseRef = useRef<BattleUIPhase>(currentPhase)
  const prevPhase = prevPhaseRef.current

  // Only update prevPhase after render to detect transitions
  if (prevPhase !== currentPhase) {
    prevPhaseRef.current = currentPhase
  }

  const phaseOrder: BattleUIPhase[] = ['idle', 'running', 'voting', 'result']
  const isProgressingForward = useMemo(() => {
    const prevIdx = phaseOrder.indexOf(prevPhase)
    const currIdx = phaseOrder.indexOf(currentPhase)
    return currIdx > prevIdx
  }, [currentPhase, prevPhase])

  return {
    currentPhase,
    prevPhase,
    isProgressingForward,
    isIdle: currentPhase === 'idle',
    isRunning: currentPhase === 'running',
    isVoting: currentPhase === 'voting',
    isResult: currentPhase === 'result',
  }
}
