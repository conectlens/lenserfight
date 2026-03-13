import { Lock, Bookmark, Pencil } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { Avatar } from '../../../components/Avatar'
import { TagBadge } from '../../../components/TagBadge'
import { PromptTemplateDetailViewModel } from '../../../types/prompts.types'
import { formatCount } from '../../../utils/numberUtils'

interface PromptDetailHeaderProps {
  prompt: PromptTemplateDetailViewModel
  onSave: () => void
  onEdit?: () => void
  canEdit?: boolean
  isSaved: boolean
  isSaving: boolean
  saveCount: number
}

export const PromptDetailHeader: React.FC<PromptDetailHeaderProps> = ({
  prompt,
  onSave,
  onEdit,
  canEdit = false,
  isSaved,
  isSaving,
  saveCount,
}) => {
  const navigate = useNavigate()
  const formattedDate = new Date(prompt.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const hasTags = prompt.tags && prompt.tags.length > 0
  const safeSaveCount = saveCount || 0

  return (
    <div className="mb-6">
      <div className="flex justify-between items-start gap-4">
        {/* Unified Title Hierarchy */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight leading-tight flex-1">
          {prompt.title}
        </h1>

        <div className="flex items-center gap-2">
          {canEdit && onEdit && (
            <button
              onClick={onEdit}
              className="group p-2.5 rounded-xl transition-all duration-200 flex-shrink-0 border bg-white dark:bg-gray-800 text-gray-400 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary-700 dark:hover:text-primary-400 hover:border-primary/30"
              aria-label="Edit prompt"
              title="Edit prompt"
            >
              <Pencil size={18} className="transition-transform duration-200 group-active:scale-95" />
            </button>
          )}

          {/* Save Action - Top Right */}
          <button
            onClick={onSave}
            disabled={isSaving}
            className={`
              group relative p-2.5 rounded-xl transition-all duration-200 flex-shrink-0 border
              ${
                isSaved
                  ? 'bg-primary/10 text-primary-700 dark:text-primary-400 border-primary/20 hover:bg-primary/20'
                  : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200 hover:border-gray-200 dark:hover:border-gray-600'
              }
            `}
            aria-label={isSaved ? 'Unsave prompt' : 'Save prompt'}
            title={isSaved ? 'Unsave' : 'Save'}
          >
            <Bookmark
              size={20}
              className={`transition-transform duration-200 ${isSaved ? 'fill-current' : ''} group-active:scale-95`}
            />

            {/* Compact Corner Badge */}
            {safeSaveCount > 0 && (
              <span
                className={`
                absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center 
                text-[10px] font-bold rounded-full border-2 border-white dark:border-gray-900 px-1 shadow-sm
                ${isSaved ? 'bg-primary text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}
              `}
              >
                {formatCount(safeSaveCount)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Metadata Row */}
      <div className="flex flex-wrap items-center gap-y-3 text-sm text-gray-500 dark:text-gray-400">
        <div
          className="flex items-center gap-2 group cursor-pointer mr-4"
          onClick={() => navigate(`/lenser/${prompt.author.handle}`)}
        >
          <Avatar
            src={prompt.author.avatarUrl}
            alt={prompt.author.displayName}
            size="sm"
            className="!w-6 !h-6"
          />
          <span className="font-semibold text-gray-900 dark:text-gray-200 group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">
            {prompt.author.displayName}
          </span>
        </div>

        <span className="text-gray-300 dark:text-gray-600 mr-4 hidden sm:inline">|</span>

        {hasTags && (
          <>
            <div className="flex flex-wrap gap-2 mr-4">
              {prompt.tags.map((tag) => (
                <TagBadge
                  key={tag.id}
                  label={tag.name}
                  className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium px-2.5 py-0.5 text-xs"
                  onClick={() => navigate(`/len/${tag.slug}`)}
                />
              ))}
            </div>
            <span className="text-gray-300 dark:text-gray-600 mr-4 hidden sm:inline">|</span>
          </>
        )}

        <div className="flex items-center gap-4">
          {prompt.visibility === 'private' && (
            <>
              <div className="flex items-center gap-1.5">
                <Lock size={14} />
                <span className="capitalize text-xs">{prompt.visibility}</span>
              </div>
              <span className="text-gray-300 dark:text-gray-600">•</span>
            </>
          )}
          <span className="text-xs">{formattedDate}</span>
        </div>
      </div>
    </div>
  )
}
