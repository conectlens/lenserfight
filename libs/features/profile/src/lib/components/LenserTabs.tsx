import { HelpButton } from '@/libs/ui/components/src'
import React, { useEffect, useRef, useState } from 'react'

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
  rightSlot?: React.ReactNode
}

export const LenserTabs: React.FC<LenserTabsProps> = ({ activeTab, onChange, tabs, rightSlot }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeButtonRef = useRef<HTMLButtonElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  })

  useEffect(() => {
    const btn = activeButtonRef.current
    const container = containerRef.current
    if (!btn || !container) return
    const containerRect = container.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()
    setIndicatorStyle({
      left: btnRect.left - containerRect.left + container.scrollLeft,
      width: btnRect.width,
    })
  }, [activeTab, tabs])

  return (
    <div
      ref={containerRef}
      className="relative flex items-center gap-8 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto scrollbar-hide"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          ref={tab.id === activeTab ? activeButtonRef : undefined}
          onClick={() => onChange(tab.id)}
          className={`
            py-3 text-sm font-semibold transition-colors duration-200 relative whitespace-nowrap
            ${
              activeTab === tab.id
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }
          `}
        >
          {tab.label}
        </button>
      ))}

      <div
        className="absolute bottom-0 h-0.5 bg-primary rounded-full pointer-events-none"
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
          transition: 'left 250ms cubic-bezier(0.4,0,0.2,1), width 250ms cubic-bezier(0.4,0,0.2,1)',
        }}
      />

      <HelpButton path="/explanation/agents/" label="About AI Agents" />
      {rightSlot}
    </div>
  )
}

interface LenserTabContentProps {
  activeTab: LenserTabId
  children: React.ReactNode
}

export const LenserTabContent: React.FC<LenserTabContentProps> = ({ activeTab, children }) => {
  const [displayedTab, setDisplayedTab] = useState(activeTab)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (activeTab === displayedTab) return
    setVisible(false)
    const t = setTimeout(() => {
      setDisplayedTab(activeTab)
      setVisible(true)
    }, 150)
    return () => clearTimeout(t)
  }, [activeTab, displayedTab])

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 150ms ease, transform 150ms ease',
      }}
    >
      {children}
    </div>
  )
}
