import React from 'react'

import { SortOption } from '@lenserfight/types'
import { SelectField } from '@lenserfight/ui/forms'

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
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sticky top-[56px] z-20 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur py-2 border-b border-gray-100/50 dark:border-gray-800/50 transition-colors">
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
      <SelectField
        value={activeSort}
        onChange={(v) => onSortChange(v as SortOption)}
        options={[
          { value: 'trending', label: 'Trending' },
          { value: 'popular', label: 'Popular' },
          { value: 'newest', label: 'Newest' },
        ]}
        className="w-40"
      />
    </div>
  )
}
