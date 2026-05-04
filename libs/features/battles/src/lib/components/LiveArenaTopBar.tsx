/**
 * LiveArenaTopBar — elapsed timer, mode indicator, and abort button.
 */
import React, { useEffect, useState } from 'react'
import { Badge, Button } from '@lenserfight/ui/components'
import { StopCircle, Radio } from 'lucide-react'

import type { BattleExecutionPhase } from '../types/battle-execution.types'

interface LiveArenaTopBarProps {
  phase: BattleExecutionPhase
  startedAt: number | null
  isCreator: boolean
  onAbort?: () => void
  mode: 'executor' | 'spectator' | 'replay'
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export const LiveArenaTopBar: React.FC<LiveArenaTopBarProps> = ({
  phase,
  startedAt,
  isCreator,
  onAbort,
  mode,
}) => {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startedAt || phase === 'complete' || phase === 'failed') return
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt)
    }, 100)
    return () => clearInterval(interval)
  }, [startedAt, phase])

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-surface-border bg-surface-raised/50">
      <div className="flex items-center gap-3">
        {mode !== 'replay' && (
          <Badge
            color={phase === 'executing' ? 'blue' : phase === 'complete' ? 'green' : 'gray'}
            variant="outline"
            className="flex items-center gap-1.5"
          >
            {phase === 'executing' && (
              <Radio size={10} className="animate-pulse text-red-500" />
            )}
            {mode === 'executor' ? 'Live' : 'Spectating'}
          </Badge>
        )}
        {mode === 'replay' && (
          <Badge color="purple" variant="outline">
            Replay
          </Badge>
        )}
        {startedAt && (
          <span className="text-xs tabular-nums text-greyscale-500 font-mono">
            {formatElapsed(elapsed)}
          </span>
        )}
      </div>

      {isCreator && phase === 'executing' && onAbort && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onAbort}
          className="flex items-center gap-1.5 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <StopCircle size={14} />
          Abort
        </Button>
      )}
    </div>
  )
}
