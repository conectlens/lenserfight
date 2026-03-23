import React from 'react'

import { ThreadReplyViewModel } from '@lenserfight/types'

import { ThreadReplyCard } from './ThreadReplyCard'

interface ThreadRepliesListProps {
  replies: ThreadReplyViewModel[]
  onReplySubmit: (content: string, parentId: string) => Promise<void>
  onReactionToggle?: (replyId: string) => void
  hasMore?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => void
}

export const ThreadRepliesList: React.FC<ThreadRepliesListProps> = ({
  replies,
  onReplySubmit,
  onReactionToggle,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}) => {
  if (replies.length === 0) return null

  return (
    <div className="space-y-2 mt-8">
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 px-2">
        {replies.length} {replies.length === 1 ? 'Comment' : 'Comments'}
      </h3>
      {replies.map((reply) => (
        <ThreadReplyCard
          key={reply.id}
          reply={reply}
          onReplySubmit={onReplySubmit}
          onReactionToggle={onReactionToggle}
        />
      ))}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="px-5 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors disabled:opacity-50"
          >
            {isLoadingMore ? 'Loading…' : 'Load more comments'}
          </button>
        </div>
      )}
    </div>
  )
}
