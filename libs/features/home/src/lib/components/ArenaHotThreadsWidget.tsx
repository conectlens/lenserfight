import { Avatar, Card, EmptyState } from '@lenserfight/ui/components'
import { timeAgo } from '@lenserfight/utils/date'
import { Flame, MessageSquare, ArrowUp } from 'lucide-react'
import React from 'react'

import { useTrendingThreads } from '../useThreads'

const DISPLAY_COUNT = 4

const SkeletonRow = () => (
  <div className="flex items-start gap-3 px-4 py-3 border-b border-surface-border last:border-0" aria-hidden="true">
    <div className="w-7 h-7 rounded-full bg-surface-raised animate-pulse flex-shrink-0" />
    <div className="flex-1 space-y-2 min-w-0">
      <div className="h-3 bg-surface-raised rounded animate-pulse w-3/4" />
      <div className="h-2.5 bg-surface-raised rounded animate-pulse w-1/2" />
    </div>
  </div>
)

interface ArenaHotThreadsWidgetProps {
  /** Base URL for thread links (e.g. 'https://moon.lenserfight.com'). Empty string for in-app routing. */
  baseUrl?: string
}

export function ArenaHotThreadsWidget({ baseUrl = '' }: ArenaHotThreadsWidgetProps) {
  const { data, isLoading } = useTrendingThreads()

  const threads = (data?.pages.flatMap((p) => p.data ?? []) ?? [])
    .slice(0, DISPLAY_COUNT)

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-surface-border bg-card/60 px-4 py-3">
        <MessageSquare size={14} aria-hidden="true" className="text-blue-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/70">
          Hot Threads
        </h3>
      </div>

      {isLoading ? (
        <ul aria-label="Loading hot threads">
          {Array.from({ length: DISPLAY_COUNT }).map((_, i) => (
            <li key={i}><SkeletonRow /></li>
          ))}
        </ul>
      ) : threads.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={Flame}
            title="No hot threads yet"
            description="Active discussions will surface here as they heat up."
          />
        </div>
      ) : (
        <ul className="divide-y divide-surface-border" aria-label="Hot threads">
          {threads.map((thread) => {
            const href = `${baseUrl}/threads/${thread.id}`
            return (
              <li key={thread.id}>
                <a
                  href={href}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-foreground/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                >
                  <Avatar
                    src={thread.author.avatarUrl ?? undefined}
                    alt={thread.author.displayName}
                    size="sm"
                    className="!w-7 !h-7 flex-shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground leading-tight">
                      {thread.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-foreground/50">
                      <span className="flex items-center gap-1" aria-label={`${thread.reactionCount} reactions`}>
                        <ArrowUp size={11} aria-hidden="true" />
                        {thread.reactionCount}
                      </span>
                      <span className="flex items-center gap-1" aria-label={`${thread.replyCount} replies`}>
                        <MessageSquare size={11} aria-hidden="true" />
                        {thread.replyCount}
                      </span>
                      <span>{timeAgo(thread.createdAt)}</span>
                    </div>
                  </div>
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
