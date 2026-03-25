import { LensViewModel } from '@lenserfight/types'
import { ActionMenu } from '@lenserfight/ui/components'
import { Avatar } from '@lenserfight/ui/components'
import { Pencil, Trash2 } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'


interface LensRelatedCardProps {
  lens: LensViewModel
  onClick: (id: string) => void
  hideAuthor?: boolean
  isOwner?: boolean
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export const LensRelatedCard: React.FC<LensRelatedCardProps> = ({
  lens,
  onClick,
  hideAuthor = false,
  isOwner,
  onEdit,
  onDelete,
}) => {
  const navigate = useNavigate()

  const handleEdit = () => {
    if (onEdit) onEdit(lens.id)
  }

  const handleDelete = () => {
    if (onDelete) onDelete(lens.id)
  }

  const menuActions = [
    { label: 'Edit', icon: <Pencil size={14} />, onClick: handleEdit },
    {
      label: 'Delete',
      icon: <Trash2 size={14} />,
      onClick: handleDelete,
      variant: 'danger' as const,
    },
  ]

  return (
    <div
      onClick={() => onClick(lens.id)}
      className="group relative flex cursor-pointer items-center gap-4 rounded-2xl border border-surface-border bg-surface-base p-4 pr-10 shadow-sm transition-colors hover:border-status-blue"
    >
      {!hideAuthor && (
        <div
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/lenser/${lens.author.handle}`)
          }}
          className="flex-shrink-0"
        >
          <Avatar
            src={lens.author.avatarUrl}
            size="sm"
            className="transition-opacity hover:opacity-80"
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h4
          className={`line-clamp-2 font-bold text-greyscale-900 transition-colors group-hover:text-status-blue dark:text-greyscale-0 ${hideAuthor ? 'text-base' : 'text-sm'}`}
        >
          {lens.title}
        </h4>
        {!hideAuthor && (
          <p
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/lenser/${lens.author.handle}`)
            }}
            className="mt-1 truncate text-xs text-greyscale-500 hover:underline hover:text-greyscale-700 dark:text-greyscale-400 dark:hover:text-greyscale-300"
          >
            by @{lens.author.handle}
          </p>
        )}
      </div>

      {isOwner && (
        <div
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <ActionMenu actions={menuActions} />
        </div>
      )}
    </div>
  )
}
