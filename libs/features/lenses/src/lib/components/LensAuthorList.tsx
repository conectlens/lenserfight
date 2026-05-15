import { LensViewModel } from '@lenserfight/types'
import { Button } from '@lenserfight/ui/components'
import { Plus } from 'lucide-react'
import React from 'react'


import { LensRelatedCard } from './LensRelatedCard'

interface LensAuthorListProps {
  lenses: LensViewModel[]
  authorName: string
  onOpen: (id: string) => void
  isLoading: boolean
  onCreateClick: () => void
  isOwner?: boolean
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export const LensAuthorList: React.FC<LensAuthorListProps> = ({
  lenses,
  authorName,
  onOpen,
  isLoading,
  onCreateClick,
  isOwner,
  onEdit,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4 mb-8">
        <div className="h-6 w-32 animate-pulse rounded-full bg-surface-raised mb-4"></div>
        {[1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface-raised" />
        ))}
      </div>
    )
  }

  if (lenses.length === 0) {
    return (
      <div className="mb-8">
        <Button onClick={onCreateClick} className="w-full flex items-center justify-center gap-2">
          <Plus size={18} />
          Create New Lens
        </Button>
      </div>
    )
  }

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-greyscale-900 dark:text-greyscale-0">
          More from {authorName}
        </h3>
        {isOwner && (
          <button
            type="button"
            onClick={onCreateClick}
            className="flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-base px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-greyscale-500 transition-colors hover:border-primary-yellow-500 hover:text-greyscale-900 dark:text-greyscale-400 dark:hover:text-greyscale-50"
            title="Create new lens"
          >
            <Plus size={12} />
            <span>New</span>
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {lenses.map((lens) => (
          <LensRelatedCard
            key={lens.id}
            lens={lens}
            onClick={onOpen}
            hideAuthor={true}
            isOwner={isOwner}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}
