import React from 'react'
import { formatDistanceToNow } from 'date-fns'

export interface ChatMessageProps {
  senderHandle: string
  senderRole?: 'viewer' | 'lenser' | 'moderator' | 'system'
  body: string
  createdAt: string
  avatarUrl?: string | null
}

const ROLE_BADGE: Record<string, string> = {
  lenser: 'Lenser',
  moderator: 'Mod',
  system: 'System',
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  senderHandle,
  senderRole = 'viewer',
  body,
  createdAt,
  avatarUrl,
}) => {
  const badge = senderRole !== 'viewer' ? ROLE_BADGE[senderRole] : null
  const initials = senderHandle.slice(0, 2).toUpperCase()
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true })

  return (
    <div className="flex items-start gap-2.5 px-3 py-2">
      <div className="flex-shrink-0 h-7 w-7 rounded-full bg-greyscale-200 dark:bg-greyscale-700 flex items-center justify-center overflow-hidden">
        {avatarUrl ? (
          <img src={avatarUrl} alt={senderHandle} className="h-full w-full object-cover" />
        ) : (
          <span className="text-[10px] font-bold text-greyscale-600 dark:text-greyscale-300">{initials}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-greyscale-900 dark:text-greyscale-50 truncate">
            {senderHandle}
          </span>
          {badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {badge}
            </span>
          )}
          <span className="text-[10px] text-greyscale-400 ml-auto flex-shrink-0">{timeAgo}</span>
        </div>
        <p className="text-xs text-greyscale-700 dark:text-greyscale-300 leading-snug mt-0.5 break-words">
          {body}
        </p>
      </div>
    </div>
  )
}
