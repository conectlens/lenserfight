import React from 'react'

const inputClass =
  'w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500'

interface FreeformInputProps {
  value: string
  onChange: (value: string) => void
}

export const FreeformInput: React.FC<FreeformInputProps> = ({ value, onChange }) => {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
        Input
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter additional context or instructions…"
        rows={3}
        className={`${inputClass} resize-none`}
      />
    </div>
  )
}
