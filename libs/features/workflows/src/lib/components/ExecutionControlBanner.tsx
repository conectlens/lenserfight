import { Loader2, PauseCircle, ShieldAlert } from 'lucide-react'
import React from 'react'

export interface ExecutionControlBannerProps {
  isSystemLocked: boolean
  isQueueFrozen:  boolean
  isStopping:     boolean
  frozenReason?:  string | null
}

/**
 * Renders a full-width status banner when the platform is in an emergency state.
 * - System locked  → red banner ("System Halted" or "System Halting…" while draining)
 * - Queue frozen   → amber banner ("Queue Frozen")
 * - Neither        → renders nothing
 *
 * Placed at the top of the workflow canvas area so it is impossible to miss.
 */
export const ExecutionControlBanner: React.FC<ExecutionControlBannerProps> = ({
  isSystemLocked,
  isQueueFrozen,
  isStopping,
  frozenReason,
}) => {
  if (isSystemLocked) {
    return (
      <div className="flex items-center gap-2 border-b border-status-red/30 bg-status-red/5 px-4 py-2 text-xs text-status-red">
        {isStopping ? (
          <Loader2 size={13} className="flex-shrink-0 animate-spin" />
        ) : (
          <ShieldAlert size={13} className="flex-shrink-0" />
        )}
        <span className="font-semibold">
          {isStopping
            ? 'System Halting — draining active runs…'
            : 'System Halted — Emergency Lock Active'}
        </span>
        <span className="ml-auto text-greyscale-400">
          Contact a platform admin to resume.
        </span>
      </div>
    )
  }

  if (isQueueFrozen) {
    return (
      <div className="flex items-center gap-2 border-b border-amber-400/30 bg-amber-50/80 px-4 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
        <PauseCircle size={13} className="flex-shrink-0" />
        <span className="font-semibold">Queue Frozen</span>
        {frozenReason && (
          <span className="text-greyscale-500">— {frozenReason}</span>
        )}
        <span className="ml-auto text-greyscale-400">
          New scheduled runs will not dispatch.
        </span>
      </div>
    )
  }

  return null
}
