import { Button } from '@lenserfight/ui/components'
import { AlertTriangle, RotateCw, TimerOff } from 'lucide-react'
import React from 'react'

import { getErrorCopy } from '../utils/workflowErrorMessages'

export interface WorkflowRunRecoveryBannerProps {
  runStatus: string
  failedNodeLabel?: string | null
  errorMessage?: string | null
  isRetrying?: boolean
  onRetry: () => void
}

export const WorkflowRunRecoveryBanner: React.FC<WorkflowRunRecoveryBannerProps> = ({
  runStatus,
  failedNodeLabel,
  errorMessage,
  isRetrying,
  onRetry,
}) => {
  const isTimedOut = runStatus === 'timed_out'
  const icon = isTimedOut ? <TimerOff size={14} /> : <AlertTriangle size={14} />
  const label = isTimedOut ? 'Run timed out' : 'Run failed'
  const humanError = getErrorCopy(errorMessage)

  return (
    <div className="mx-4 mt-3 rounded-2xl border border-status-red/30 bg-status-red/5 p-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex-shrink-0 text-status-red">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-status-red">{label}</p>
          {failedNodeLabel && (
            <p className="mt-0.5 text-[11px] text-greyscale-500 truncate">
              Failed at: <span className="font-medium text-greyscale-700 dark:text-greyscale-300">{failedNodeLabel}</span>
            </p>
          )}
          {humanError && (
            <p className="mt-1 text-[11px] text-greyscale-500 leading-relaxed">{humanError}</p>
          )}
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={onRetry}
          isLoading={isRetrying}
          disabled={isRetrying}
          className="flex-shrink-0 gap-1.5 border-status-red/30 text-status-red hover:bg-status-red/10"
        >
          <RotateCw size={11} />
          Retry
        </Button>
      </div>
    </div>
  )
}
