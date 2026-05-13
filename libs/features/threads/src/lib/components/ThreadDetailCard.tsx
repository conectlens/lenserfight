import { GitBranch, Lock, MessageSquare, Swords } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { Avatar } from '@lenserfight/ui/components'
import { MentionRenderer } from '@lenserfight/ui/components'
import { ThreadDetailViewModel } from '@lenserfight/types'
import { timeAgo } from '@lenserfight/utils/date'

import { ThreadReactionBar } from './ThreadReactionBar'

interface ThreadDetailCardProps {
  thread: ThreadDetailViewModel
  onPromptClick?: (id: string) => void
  onToggleReaction: () => void
}

export const ThreadDetailCard: React.FC<ThreadDetailCardProps> = ({ thread, onToggleReaction }) => {
  const navigate = useNavigate()

  const handleAuthorClick = () => {
    navigate(`/lenser/${thread.author.handle}`)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8 transition-colors">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div
          onClick={handleAuthorClick}
          className="cursor-pointer transition-opacity hover:opacity-80"
        >
          <Avatar src={thread.author.avatarUrl} alt={thread.author.displayName} size="md" />
        </div>
        <div>
          <h3
            onClick={handleAuthorClick}
            className="text-base font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-primary-700 dark:hover:text-primary-400 transition-colors"
          >
            {thread.author.displayName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{timeAgo(thread.createdAt)}</p>
        </div>
      </div>

      {/* Content */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 leading-tight tracking-tight break-words">
          {thread.title}
        </h1>
        <div className="text-base md:text-lg text-gray-800 dark:text-gray-200 leading-relaxed break-words">
          <MentionRenderer content={thread.content} />
        </div>
      </div>

      {thread.visibility === 'private' && (
        <div className="mb-6">
          <span
            className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
            title="Private thread"
          >
            <Lock size={12} />
            Private
          </span>
        </div>
      )}

      {/* Footer: Tags & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-50 dark:border-gray-700">
        <ThreadReactionBar
          count={thread.reactionCount}
          hasReacted={thread.userHasReacted}
          onReact={onToggleReaction}
        />
      </div>
    </div>
  )
}
