import { AlertTriangle, ChevronDown, ShieldAlert } from 'lucide-react'
import React, { useState } from 'react'

import { Button } from './Button'

interface DangerZoneProps {
  title?: string
  description?: string
  buttonLabel?: string
  onAction: () => void
  isLoading?: boolean
}

export const DangerZone: React.FC<DangerZoneProps> = ({
  title = 'Delete Account',
  description = 'Permanently remove your account and all associated data. This action is irreversible.',
  buttonLabel = 'Delete Account',
  onAction,
  isLoading,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800">
      <div
        className={`
          border rounded-xl overflow-hidden transition-all duration-300 ease-in-out
          ${
            isExpanded
              ? 'border-red-100 dark:border-red-900/30 bg-gray-50/50 dark:bg-gray-800/30 shadow-sm'
              : 'border-gray-200 dark:border-gray-800 bg-transparent opacity-80 hover:opacity-100'
          }
        `}
      >
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-5 text-left focus:outline-none group"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}
            >
              <ShieldAlert size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                Manage account removal
              </p>
            </div>
          </div>

          <div
            className={`p-2 rounded-full transition-all duration-300 ${isExpanded ? 'rotate-180 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'text-gray-400 group-hover:bg-gray-100 dark:group-hover:bg-gray-800'}`}
          >
            <ChevronDown size={16} />
          </div>
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="px-5 pb-5 pt-0">
            <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg mb-6 text-sm">
              <div className="flex gap-3">
                <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-gray-600 dark:text-gray-300">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    Please read carefully
                  </p>
                  <p>{description}</p>
                  <p>
                    This action will initiate a deletion request. You will be logged out immediately
                    and access will be restricted.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => setIsExpanded(false)}
                className="w-full sm:w-auto text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 h-9"
              >
                Cancel
              </Button>
              <Button
                onClick={onAction}
                isLoading={isLoading}
                className="w-full sm:w-auto bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-bold px-5 h-9 shadow-sm"
              >
                {buttonLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
