import { Sparkles } from 'lucide-react'
import React from 'react'

import { PromptTemplateViewModel } from '@lenserfight/types'

interface MentionAutocompleteListProps {
  suggestions: PromptTemplateViewModel[]
  activeIndex: number
  onSelect: (prompt: PromptTemplateViewModel) => void
  position: { top: number; left: number }
  visible: boolean
}

export const MentionAutocompleteList: React.FC<MentionAutocompleteListProps> = ({
  suggestions,
  activeIndex,
  onSelect,
  position,
  visible,
}) => {
  if (!visible || suggestions.length === 0) return null

  return (
    <div
      className="fixed z-[9999] w-72 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-75"
      style={{
        top: position.top, // RichMentionInput already adds offset
        left: position.left,
      }}
    >
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
        <Sparkles size={12} className="text-primary-600 dark:text-primary-400" />
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Mention Prompt
        </span>
      </div>
      <ul className="max-h-60 overflow-y-auto">
        {suggestions.map((prompt, index) => (
          <li
            key={prompt.id}
            onMouseDown={(e) => {
              e.preventDefault() // Prevent blur on input
              onSelect(prompt)
            }}
            className={`
              px-4 py-3 cursor-pointer border-b border-gray-50 dark:border-gray-800 last:border-0 transition-colors
              ${index === activeIndex ? 'bg-primary/10 dark:bg-primary/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}
            `}
          >
            <div className="flex flex-col">
              <span
                className={`text-sm font-medium ${index === activeIndex ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}
              >
                {prompt.title}
              </span>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-400 dark:text-gray-500">@{prompt.author.handle}</span>
                <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
                  {prompt.usageCount} uses
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
