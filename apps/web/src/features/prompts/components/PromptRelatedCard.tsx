import { Pencil, Trash2 } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { ActionMenu } from '../../../components/ActionMenu'
import { Avatar } from '../../../components/Avatar'
import { PromptTemplateViewModel } from '../../../types/prompts.types'

interface PromptRelatedCardProps {
  prompt: PromptTemplateViewModel
  onClick: (id: string) => void
  hideAuthor?: boolean
  isOwner?: boolean
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export const PromptRelatedCard: React.FC<PromptRelatedCardProps> = ({
  prompt,
  onClick,
  hideAuthor = false,
  isOwner,
  onEdit,
  onDelete,
}) => {
  const navigate = useNavigate()

  const handleEdit = () => {
    if (onEdit) onEdit(prompt.id)
  }

  const handleDelete = () => {
    if (onDelete) onDelete(prompt.id)
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
      onClick={() => onClick(prompt.id)}
      className="flex gap-4 items-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group relative pr-10"
    >
      {!hideAuthor && (
        <div
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/lenser/${prompt.author.handle}`)
          }}
          className="flex-shrink-0"
        >
          <Avatar
            src={prompt.author.avatarUrl}
            size="sm"
            className="hover:opacity-80 transition-opacity"
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h4
          className={`font-bold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2 ${hideAuthor ? 'text-base' : 'text-sm'}`}
        >
          {prompt.title}
        </h4>
        {!hideAuthor && (
          <p
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/lenser/${prompt.author.handle}`)
            }}
            className="text-xs text-gray-500 dark:text-gray-400 hover:underline hover:text-gray-700 dark:hover:text-gray-300 truncate mt-1"
          >
            by @{prompt.author.handle}
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
