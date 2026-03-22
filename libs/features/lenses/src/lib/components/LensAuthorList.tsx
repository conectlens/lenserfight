import { Plus } from 'lucide-react'
import React from 'react'

import { Button } from '@lenserfight/ui/components'
import { LensViewModel } from '@lenserfight/types'

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
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
        {[1, 2].map((i) => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
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
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        More from {authorName}
      </h3>
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
