import React from 'react'

import { LeaderboardScope } from '@lenserfight/types'

interface LenserBoardTabsProps {
  activeScope: LeaderboardScope
  onChange: (scope: LeaderboardScope) => void
}

export const LenserBoardTabs: React.FC<LenserBoardTabsProps> = ({ activeScope, onChange }) => {
  const tabs: { id: LeaderboardScope; label: string }[] = [
    { id: 'global', label: 'Global' },
    { id: 'season', label: 'Current Season' },
  ]

  return (
    <div className="bg-white dark:bg-gray-800 p-1.5 rounded-xl inline-flex shadow-sm border border-gray-100 dark:border-gray-700 mb-6 md:mb-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200
            ${
              activeScope === tab.id
                ? 'bg-primary text-gray-900 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
            }
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
