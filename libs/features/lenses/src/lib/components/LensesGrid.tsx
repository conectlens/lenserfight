import { EmptyState } from '@lenserfight/ui/components'
import React from 'react'

import { LensViewModel } from '@lenserfight/types'

import { LensCard } from './LensCard'

interface LensesGridProps {
  lenses: LensViewModel[]
  isLoading: boolean
  onOpen: (id: string) => void
}

export const LensesGrid: React.FC<LensesGridProps> = ({ lenses, isLoading, onOpen }) => {
  if (isLoading) {
    return (
      <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="break-inside-avoid mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 h-64 p-6 animate-pulse flex flex-col">
              {/* Header */}
              <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-4 mt-2"></div>
              {/* Text */}
              <div className="space-y-2 mb-6 flex-1">
                <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-2 w-2/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
              {/* Tags */}
              <div className="flex gap-2 mb-6">
                <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
              {/* Footer */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-50 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (lenses.length === 0) {
    return (
      <EmptyState
        title="No prompts match these filters"
        description="Try another modality or clear filters. Lens prompts can be reused in battles, workflows, and lab runs."
        className="py-20 bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"
      />
    )
  }

  return (
    <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6">
      {lenses.map((lens) => (
        <div key={lens.id} className="break-inside-avoid mb-6">
          <LensCard lens={lens} onClick={onOpen} />
        </div>
      ))}
    </div>
  )
}
