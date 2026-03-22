import { Lock, Copy, Pencil, Trash2 } from 'lucide-react'
import React, { memo } from 'react'
import { useNavigate } from 'react-router-dom'

import { Avatar } from '@lenserfight/ui/components'
import { PromptTemplateViewModel } from '@lenserfight/types'
import { formatCount } from '@lenserfight/utils/number'

interface PromptCardProps {
  prompt: PromptTemplateViewModel
  onClick: (id: string) => void
  isOwner?: boolean
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export const PromptCard: React.FC<PromptCardProps> = memo(
  ({ prompt, onClick, isOwner, onEdit, onDelete }) => {
    const navigate = useNavigate()

    const handleUserClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      navigate(`/lenser/${prompt.author.handle}`)
    }

    const handleEdit = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (onEdit) onEdit(prompt.id)
    }

    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (onDelete) onDelete(prompt.id)
    }

    return (
      <div
        onClick={() => onClick(prompt.id)}
        className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/40 cursor-pointer overflow-hidden h-full"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100 dark:bg-gray-700 group-hover:bg-primary transition-colors duration-300" />

        {isOwner && (
          <div className="absolute top-4 right-4 flex gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleEdit}
              className="p-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:text-blue-600 hover:border-blue-200 dark:hover:text-blue-400 rounded-lg shadow-sm transition-colors"
              title="Edit Prompt"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:text-red-600 hover:border-red-200 dark:hover:text-red-400 rounded-lg shadow-sm transition-colors"
              title="Delete Prompt"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}

        <div className="flex justify-between items-start mb-4 pt-2">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight group-hover:text-primary-800 dark:group-hover:text-primary-400 transition-colors pr-8">
            {prompt.title}
          </h3>
          {prompt.visibility === 'private' && (
            <div
              className="text-gray-300 dark:text-gray-600 ml-2 mt-1 flex-shrink-0"
              title="Private Prompt"
            >
              <Lock size={14} />
            </div>
          )}
        </div>

        <div className="mb-6 flex-1">
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed font-normal line-clamp-3">
            {prompt.description || 'No description provided.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {(prompt.tags ?? []).slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/len/${tag.slug}`)
              }}
              className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-md border border-gray-100 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              {tag.name}
            </span>
          ))}
          {(prompt.tags?.length ?? 0) > 3 && (
            <span className="text-[10px] text-gray-400 dark:text-gray-600 self-center px-1 font-medium">
              +{prompt.tags!.length - 3}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-700 mt-auto">
          <div className="flex items-center gap-2 group/author z-10" onClick={handleUserClick}>
            <Avatar
              src={prompt.author.avatarUrl}
              alt={prompt.author.displayName}
              size="sm"
              className="!w-6 !h-6 ring-2 ring-white dark:ring-gray-800"
            />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 group-hover/author:text-gray-900 dark:group-hover/author:text-gray-200 transition-colors truncate max-w-[120px]">
              {prompt.author.displayName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {prompt.latestVersionNumber != null && prompt.latestVersionNumber > 1 && (
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded tabular-nums">
                v{prompt.latestVersionNumber}
              </span>
            )}
            <div
              className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"
              title={`${prompt.usageCount} uses`}
            >
              <Copy size={14} />
              <span className="text-xs font-semibold font-mono">
                {formatCount(prompt.usageCount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }
)
