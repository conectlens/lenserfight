import { FileQuestion } from 'lucide-react'
import React from 'react'

import { LensViewModel } from '@lenserfight/types'

import { LensRelatedCard } from './LensRelatedCard'

interface LensRelatedListProps {
  lenses: LensViewModel[]
  onOpen: (id: string) => void
  isLoading: boolean
  isOwner?: boolean
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export const LensRelatedList: React.FC<LensRelatedListProps> = ({
  lenses,
  onOpen,
  isLoading,
  isOwner,
  onEdit,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Related Lenses</h3>

      {lenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 border-dashed text-center">
          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3 text-gray-400 dark:text-gray-500">
            <FileQuestion size={20} />
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">No related lenses</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            We couldn't find any similar templates.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {lenses.map((lens) => (
            <LensRelatedCard
              key={lens.id}
              lens={lens}
              onClick={onOpen}
              isOwner={false}
              hideAuthor={true}
            />
          ))}
        </div>
      )}
    </div>
  )
}
