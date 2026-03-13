import { SlidersHorizontal } from 'lucide-react'
import React from 'react'

import { SortOption } from '@lenserfight/types'

interface TagFilterBarProps {
  filters: { value: string; label: string }[]
  activeFilter: string
  onFilterChange: (val: any) => void
  activeSort: SortOption
  onSortChange: (val: SortOption) => void
}

export const TagFilterBar: React.FC<TagFilterBarProps> = ({
  filters,
  activeFilter,
  onFilterChange,
  activeSort,
  onSortChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sticky top-[60px] z-20 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur py-3 border-b border-gray-100/50 dark:border-gray-800/50 transition-colors">
      {/* Tabs */}
      <div className="flex p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-x-auto scrollbar-hide max-w-full">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            className={`
                    px-4 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap
                    ${
                      activeFilter === f.value
                        ? 'bg-primary text-gray-900 shadow-sm font-bold'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                 `}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="relative inline-flex items-center">
        <SlidersHorizontal className="absolute left-3 w-4 h-4 text-gray-500 pointer-events-none" />
        <select
          value={activeSort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-2 pl-9 pr-10 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors shadow-sm"
        >
          <option value="trending">Trending</option>
          <option value="popular">Popular</option>
          <option value="newest">Newest</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  )
}
