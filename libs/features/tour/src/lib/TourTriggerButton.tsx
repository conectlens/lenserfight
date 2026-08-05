import { Tooltip } from '@lenserfight/ui/components'
import { HelpCircle } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useTour } from './TourContext'

/**
 * Small icon button that restarts the tour for the current route.
 * Hidden when no tour matches the current path or a tour is already active.
 */
export const TourTriggerButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useTranslation()
  const { activeTour, tourForCurrentPath, start } = useTour()

  if (!tourForCurrentPath || activeTour) return null

  return (
    <Tooltip content={t('tour.ui.takeTour')}>
      <button
        type="button"
        aria-label={t('tour.ui.takeTour')}
        onClick={() => start(tourForCurrentPath.id)}
        className={`rounded-lg p-1.5 text-greyscale-500 transition-colors hover:bg-greyscale-100 hover:text-greyscale-700 dark:text-greyscale-400 dark:hover:bg-greyscale-800 dark:hover:text-greyscale-200 ${className}`}
      >
        <HelpCircle className="h-4 w-4" />
      </button>
    </Tooltip>
  )
}
