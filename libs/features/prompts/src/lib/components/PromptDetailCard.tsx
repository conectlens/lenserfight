import { Copy, Eye, Lock, Pencil } from 'lucide-react'
import React from 'react'

import { Avatar } from '@lenserfight/ui/components'
import { Button } from '@lenserfight/ui/components'
import { PromptTemplateDetailViewModel } from '@lenserfight/types'
import { timeAgo } from '@lenserfight/utils/date'

import { PromptReactionBar } from './PromptReactionBar'
import { PromptTagsBar } from './PromptTagsBar'

interface PromptDetailCardProps {
  prompt: PromptTemplateDetailViewModel
  onUse: () => void
  canEdit?: boolean
  onEdit?: () => void
}

export const PromptDetailCard: React.FC<PromptDetailCardProps> = ({
  prompt,
  onUse,
  canEdit = false,
  onEdit,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
      <div className="p-8 border-b border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar src={prompt.author.avatarUrl} alt={prompt.author.displayName} size="md" />
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {prompt.author.displayName}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>@{prompt.author.handle}</span>
              <span>•</span>
              <span>{timeAgo(prompt.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Title & Desc */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{prompt.title}</h1>
          <div className="flex items-center gap-2">
            {prompt.visibility === 'private' && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                title="Private prompt"
              >
                <Lock size={12} />
                Private
              </span>
            )}
            {canEdit && onEdit && (
              <button
                onClick={onEdit}
                className="p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:text-primary-700 hover:border-primary/40 dark:hover:text-primary-400 rounded-lg shadow-sm transition-colors"
                title="Edit Prompt"
                aria-label="Edit prompt"
              >
                <Pencil size={14} />
              </button>
            )}
          </div>
        </div>
        {prompt.description && (
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            {prompt.description}
          </p>
        )}

        {/* Tags & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <PromptTagsBar tags={prompt.tags} />
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <Eye size={18} />
              <span className="text-sm font-medium">{prompt.usageCount} uses</span>
            </div>
            <PromptReactionBar counts={prompt.reactionCounts} />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-gray-50 dark:bg-gray-900 p-8 transition-colors">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Prompt Template
          </h3>
          <button className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center gap-1 text-sm font-medium transition-colors">
            <Copy size={16} />
            Copy
          </button>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm transition-colors">
          <pre className="whitespace-pre-wrap font-sans text-base text-gray-800 dark:text-gray-200 leading-relaxed">
            {prompt.content}
          </pre>
        </div>

        <div className="mt-8 flex justify-end">
          <Button onClick={onUse} className="w-auto px-8">
            Use This Prompt
          </Button>
        </div>
      </div>
    </div>
  )
}
