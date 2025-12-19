import { Search } from 'lucide-react'
import React from 'react'

interface PromptsSearchBarProps {
  value: string
  onChange: (val: string) => void
}

export const PromptsSearchBar: React.FC<PromptsSearchBarProps> = ({ value, onChange }) => {
  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary sm:text-sm transition-all shadow-sm"
        placeholder="Search for prompts..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
