import React from 'react'
import { Clock, Zap } from 'lucide-react'
import { useCountdown } from '../../hooks/utils/useCountdown'

interface ExecutionCountdownProps {
  executionStartsAt: string
  className?: string
}

export const ExecutionCountdown: React.FC<ExecutionCountdownProps> = ({
  executionStartsAt,
  className = '',
}) => {
  const countdown = useCountdown(executionStartsAt, 'Execution starts in')

  if (!countdown) return null

  if (countdown.expired) {
    return (
      <div className={`flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 ${className}`}>
        <Zap size={14} className="animate-pulse flex-shrink-0" />
        <span className="font-medium">Starting execution…</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Clock
        size={14}
        className={`flex-shrink-0 ${countdown.urgent ? 'text-amber-500' : 'text-greyscale-400'}`}
      />
      <span
        className={`text-sm font-medium tabular-nums ${
          countdown.urgent
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-greyscale-600 dark:text-greyscale-300'
        }`}
      >
        {countdown.label}: {countdown.formatted}
      </span>
    </div>
  )
}
