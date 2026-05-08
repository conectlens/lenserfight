import { HelpButton } from '@/libs/ui/components/src'
import React from 'react'
export type LenserTabId =
  | 'actions'
  | 'lenses'
  | 'threads'
  | 'challenges'
  | 'agents'
  | 'overview'
  | 'workflows'
  | 'logs'
  | 'schedules'
  | 'ai_overview'
  | 'ai_runs'
  | 'ai_workflows'
  | 'ai_about'
  | 'ai_team'
  | 'ai_threads'
  | 'ai_actions'
  | 'ai_cron'

export interface LenserTabDefinition {
  id: LenserTabId
  label: string
}

interface LenserTabsProps {
  activeTab: LenserTabId
  onChange: (tab: LenserTabId) => void
  tabs: LenserTabDefinition[]
}

export const LenserTabs: React.FC<LenserTabsProps> = ({ activeTab, onChange, tabs }) => {
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
      <HelpButton path="/explanation/agents/" label="About AI Agents" />
    </div>
  )
}
