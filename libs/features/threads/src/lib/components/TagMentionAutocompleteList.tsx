import { Hash, Plus } from 'lucide-react'
import React from 'react'

import { TagUsage } from '@lenserfight/types'
import { formatCount } from '@lenserfight/utils/number'

interface TagMentionAutocompleteListProps {
  suggestions: TagUsage[]
  activeIndex: number
  onSelect: (tag: TagUsage) => void
  position: { top: number; left: number }
  visible: boolean
  createQuery?: string
  onCreate?: (name: string) => void
}

export const TagMentionAutocompleteList: React.FC<TagMentionAutocompleteListProps> = ({
  suggestions,
  activeIndex,
  onSelect,
  position,
  visible,
  createQuery,
  onCreate,
}) => {
  const hasExactMatch = suggestions.some(
    (t) => t.name.toLowerCase() === createQuery?.toLowerCase()
  )
  const showCreate = !!createQuery && !!onCreate && !hasExactMatch

  if (!visible || (suggestions.length === 0 && !showCreate)) return null

  return (
    <div
      className="fixed z-[9999] w-64 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-75"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
        <Hash size={12} className="text-teal-600 dark:text-teal-400" />
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Mention Tag
        </span>
      </div>
      <ul className="max-h-60 overflow-y-auto">
        {suggestions.map((tag, index) => (
          <li
            key={tag.id}
            onMouseDown={(e) => {
              e.preventDefault()
              onSelect(tag)
            }}
            className={`
              px-4 py-2.5 cursor-pointer border-b border-gray-50 dark:border-gray-800 last:border-0 transition-colors
              ${index === activeIndex ? 'bg-teal-50 dark:bg-teal-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}
            `}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-sm font-medium ${index === activeIndex ? 'text-teal-700 dark:text-teal-300' : 'text-gray-700 dark:text-gray-200'}`}
              >
                #{tag.name}
              </span>
              {tag.count > 0 && (
                <span className="text-[10px] bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 px-1.5 py-0.5 rounded-full">
                  {formatCount(tag.count)} uses
                </span>
              )}
            </div>
          </li>
        ))}
        {showCreate && (
          <li
            onMouseDown={(e) => {
              e.preventDefault()
              onCreate!(createQuery)
            }}
            className="px-4 py-2.5 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 border-t border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center gap-2">
              <Plus size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
              <span className="text-sm font-medium text-teal-700 dark:text-teal-300">
                Create <span className="font-bold">#{createQuery}</span>
              </span>
            </div>
          </li>
        )}
      </ul>
    </div>
  )
}
