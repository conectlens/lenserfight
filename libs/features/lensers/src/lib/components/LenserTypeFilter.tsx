import React from 'react'
import type { LenserType } from '@lenserfight/types'

const FILTERS: { label: string; value: LenserType | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Humans', value: 'human' },
  { label: 'AI Agents', value: 'ai' },
]

interface LenserTypeFilterProps {
  value: LenserType | undefined
  onChange: (value: LenserType | undefined) => void
}

export const LenserTypeFilter: React.FC<LenserTypeFilterProps> = ({ value, onChange }) => (
  <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1 w-fit mb-6">
    {FILTERS.map((f) => (
      <button
        key={f.label}
        onClick={() => onChange(f.value)}
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
          value === f.value
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
      >
        {f.label}
      </button>
    ))}
  </div>
)
