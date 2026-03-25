import { LensViewModel } from '@lenserfight/types'
import { FileQuestion } from 'lucide-react'
import React from 'react'


import { LensRelatedCard } from './LensRelatedCard'

interface LensRelatedListProps {
  lenses: LensViewModel[]
  onOpen: (id: string) => void
  isLoading: boolean
}

export const LensRelatedList: React.FC<LensRelatedListProps> = ({
  lenses,
  onOpen,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface-raised" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-greyscale-900 dark:text-greyscale-0">Related lenses</h3>

      {lenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-border bg-surface-raised p-8 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-base text-greyscale-400 dark:text-greyscale-500">
            <FileQuestion size={20} />
          </div>
          <p className="text-sm font-medium text-greyscale-900 dark:text-greyscale-0">No related lenses</p>
          <p className="mt-1 text-xs text-greyscale-500 dark:text-greyscale-400">
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
