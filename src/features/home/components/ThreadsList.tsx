import React from 'react'

import { ThreadFeedItem } from '../../../types/threads.types'

import { ThreadsListCard } from './ThreadsListCard'

interface ThreadsListProps {
  threads: ThreadFeedItem[]
  isLoading: boolean
  onOpenThread: (id: string) => void
}

export const ThreadsList: React.FC<ThreadsListProps> = ({ threads, isLoading, onOpenThread }) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 h-64 animate-pulse"
          >
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="flex-1 space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {threads.map((thread) => (
        <ThreadsListCard key={thread.id} thread={thread} onOpen={onOpenThread} />
      ))}
    </div>
  )
}
