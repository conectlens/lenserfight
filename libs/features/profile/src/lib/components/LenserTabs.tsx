import React from 'react'

import { FEATURES } from '@lenserfight/utils/env'

type Tab = 'actions' | 'lenses' | 'threads' | 'challenges'

interface LenserTabsProps {
  activeTab: Tab
  onChange: (tab: Tab) => void
  hideActions?: boolean
}

export const LenserTabs: React.FC<LenserTabsProps> = ({ activeTab, onChange, hideActions = false }) => {
  // Order: Threads, Lenses, Actions
  const tabs: { id: Tab; label: string }[] = [
    { id: 'threads', label: 'Threads' },
    { id: 'lenses', label: 'Lenses' },
    ...(!hideActions ? [{ id: 'actions' as Tab, label: 'Actions' }] : []),
  ]

  if (FEATURES.CHALLENGES_TAB) {
    tabs.push({ id: 'challenges', label: 'Challenge History' })
  }

  return (
    <div className="flex items-center gap-8 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            py-3 text-sm font-semibold transition-all relative whitespace-nowrap
            ${activeTab === tab.id ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}
          `}
        >
          {tab.label}
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"></div>
          )}
        </button>
      ))}
    </div>
  )
}
