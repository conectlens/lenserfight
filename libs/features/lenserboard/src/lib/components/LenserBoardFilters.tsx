import React from 'react'

import { LeaderboardTimeframe } from '@lenserfight/types'

interface LenserBoardFiltersProps {
  activeTimeframe: LeaderboardTimeframe
  onChange: (timeframe: LeaderboardTimeframe) => void
}

export const LenserBoardFilters: React.FC<LenserBoardFiltersProps> = ({
  activeTimeframe,
  onChange,
}) => {
  const options: { id: LeaderboardTimeframe; label: string }[] = [
    { id: 'weekly', label: 'This Week' },
    { id: 'monthly', label: 'This Month' },
    { id: 'all_time', label: 'All Time' },
  ]

  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`
            px-4 py-2 rounded-xl text-sm font-medium transition-colors
            ${
              activeTimeframe === opt.id
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'
            }
          `}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
