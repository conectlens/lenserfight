import { Button } from '@lenserfight/ui/components'
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
      <Button
        type="button"
        variant="danger"
        size="sm"
        onClick={onResume}
        disabled={isPending}
        isLoading={isPending}
      >
        {isPending ? 'Resuming…' : 'Resume'}
      </Button>
    </div>
  )
}
