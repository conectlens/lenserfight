import { Swords, Users } from 'lucide-react'
import React from 'react'

import type { BrowseBattleRecord } from '@lenserfight/data/repositories'

interface BattleMentionAutocompleteListProps {
  suggestions: BrowseBattleRecord[]
  activeIndex: number
  onSelect: (battle: BrowseBattleRecord) => void
  position: { top: number; left: number }
  visible: boolean
  isLoading?: boolean
  query?: string
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  executing: 'Running',
  voting: 'Voting',
  scoring: 'Scoring',
  closed: 'Closed',
  published: 'Published',
  archived: 'Archived',
}

export const BattleMentionAutocompleteList: React.FC<BattleMentionAutocompleteListProps> = ({
  suggestions,
  activeIndex,
  onSelect,
  position,
  visible,
  isLoading = false,
  query,
}) => {
  if (!visible || (suggestions.length === 0 && !isLoading)) return null

  return (
    <div
      className="fixed z-[9999] w-80 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-75"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
        <Swords size={12} className="text-rose-600 dark:text-rose-400" />
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Mention Battle
        </span>
      </div>
      {isLoading ? (
        <div className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">Searching…</div>
      ) : suggestions.length === 0 ? (
        <div className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">
          No battles found{query ? ` for "${query}"` : ''}.
        </div>
      ) : (
        <ul className="max-h-60 overflow-y-auto">
          {suggestions.map((battle, index) => (
            <li
              key={battle.id}
              onMouseDown={(e) => {
                e.preventDefault()
                onSelect(battle)
              }}
              className={`
                px-4 py-2.5 cursor-pointer border-b border-gray-50 dark:border-gray-800 last:border-0 transition-colors
                ${index === activeIndex ? 'bg-rose-50 dark:bg-rose-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}
              `}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-sm font-medium truncate ${index === activeIndex ? 'text-rose-700 dark:text-rose-300' : 'text-gray-700 dark:text-gray-200'}`}
                >
                  {battle.title}
                </span>
                <span className="shrink-0 text-[10px] bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-full">
                  {STATUS_LABEL[battle.status] ?? battle.status}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                <Users size={11} />
                <span>
                  {battle.contender_count} contender{battle.contender_count === 1 ? '' : 's'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
