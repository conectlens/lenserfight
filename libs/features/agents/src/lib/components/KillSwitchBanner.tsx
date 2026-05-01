import { ShieldOff } from 'lucide-react'
import React from 'react'

interface KillSwitchBannerProps {
  aiLenserId: string
  onResume: () => void
  isPending?: boolean
}

export const KillSwitchBanner: React.FC<KillSwitchBannerProps> = ({
  onResume,
  isPending = false,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
      <div className="flex items-center gap-3">
        <ShieldOff
          size={18}
          className="flex-shrink-0 text-red-600 dark:text-red-400"
        />
        <p className="text-sm font-semibold text-red-900 dark:text-red-100">
          Kill switch is active. New runs are blocked.
        </p>
      </div>
      <button
        type="button"
        onClick={onResume}
        disabled={isPending}
        className="rounded-xl border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-700 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
      >
        {isPending ? 'Resuming…' : 'Resume'}
      </button>
    </div>
  )
}
