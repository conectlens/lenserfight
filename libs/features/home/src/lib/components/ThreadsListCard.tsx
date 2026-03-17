import { ArrowUp, MessageSquare, Pencil, Trash2, Lock } from 'lucide-react'
import React, { memo } from 'react'
import { useNavigate } from 'react-router-dom'

import { Avatar } from '@lenserfight/ui/components'
import { Card } from '@lenserfight/ui/components'
import { MentionRenderer } from '@lenserfight/ui/components'
import { TagBadge } from '@lenserfight/ui/components'
import { ThreadFeedItem } from '@lenserfight/types'
import { timeAgo } from '@lenserfight/utils/date'

interface ThreadsListCardProps {
  thread: ThreadFeedItem
  onOpen: (id: string) => void
  isOwner?: boolean
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export const ThreadsListCard: React.FC<ThreadsListCardProps> = memo(
  ({ thread, onOpen, isOwner, onEdit, onDelete }) => {
    const navigate = useNavigate()

    if (!thread?.author) {
      return null
    }

    const handleUserClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      navigate(`/lenser/${thread.author.handle}`)
    }

    const handleEdit = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (onEdit) onEdit(thread.id)
    }

    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (onDelete) onDelete(thread.id)
    }

    return (
      <div onClick={() => onOpen(thread.id)} className="cursor-pointer group relative">
        <Card className="hover:shadow-md transition-all duration-200 border-gray-200 dark:border-gray-700 group-hover:border-primary/40 relative dark:bg-gray-800">
          {isOwner && (
            <div className="absolute top-4 right-4 flex gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleEdit}
                className="p-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:text-blue-600 hover:border-blue-200 dark:hover:text-blue-400 rounded-lg shadow-sm transition-colors"
                title="Edit Thread"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={handleDelete}
                className="p-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:text-red-600 hover:border-red-200 dark:hover:text-red-400 rounded-lg shadow-sm transition-colors"
                title="Delete Thread"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}

          <div className="flex items-start gap-4">
            <div
              onClick={handleUserClick}
              className="flex-shrink-0 hover:opacity-80 transition-opacity z-10"
            >
              <Avatar src={thread.author.avatarUrl} alt={thread.author.displayName} size="md" />
            </div>

            <div className="flex-1 min-w-0 pr-8">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span
                    onClick={handleUserClick}
                    className="text-base font-semibold text-gray-900 dark:text-white hover:underline hover:text-deep dark:hover:text-primary cursor-pointer z-10"
                  >
                    {thread.author.displayName}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-600">•</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {timeAgo(thread.createdAt)}
                  </p>
                  {thread.visibility === 'private' && (
                    <div className="ml-1 text-gray-400 dark:text-gray-500" title="Private Thread">
                      <Lock size={12} />
                    </div>
                  )}
                </div>
              </div>

              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 leading-tight group-hover:text-deep dark:group-hover:text-primary transition-colors break-words">
                {thread.title}
              </h2>

              <div className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 leading-relaxed pointer-events-none break-words">
                <MentionRenderer content={thread.content} simple={true} />
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {thread.tags.map((tag) => (
                  <TagBadge
                    key={tag.id}
                    label={tag.name}
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/len/${tag.slug}`)
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-6 pt-2 border-t border-gray-50 dark:border-gray-700">
                <div
                  className={`flex items-center font-medium text-sm transition-colors ${thread.userHasReacted ? 'text-primary-700 dark:text-primary-400 font-bold' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  <ArrowUp
                    className={`w-4 h-4 mr-2 ${thread.userHasReacted ? 'stroke-[3px]' : ''}`}
                  />
                  <span>{thread.reactionCount}</span>
                </div>
                <div className="flex items-center text-gray-500 dark:text-gray-400 font-medium text-sm">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  <span>{thread.replyCount} replies</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }
)
