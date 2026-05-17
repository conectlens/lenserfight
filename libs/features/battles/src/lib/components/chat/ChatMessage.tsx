import React from 'react'

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

const formatTimeAgo = (date: string): string => {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
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
  const timeAgo = formatTimeAgo(createdAt)

  return (
    <div className="flex items-start gap-3 px-4 py-2 hover:bg-surface-raised/50 transition-colors group">
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-surface-interactive flex items-center justify-center overflow-hidden border border-surface-border sombra-sm">
        {avatarUrl ? (
          <img src={avatarUrl} alt={senderHandle} className="h-full w-full object-cover" />
        ) : (
          <span className="text-[10px] font-bold text-surface-text-muted">{initials}</span>
        )}
      </div>
      <div className="flex-1 min-w-0 md:pt-0.5">
        <div className="flex items-baseline justify-between gap-2 mb-0.5 max-w-full">
          <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-2">
            <span className="text-sm font-bold text-surface-text truncate">
              {senderHandle}
            </span>
            {badge && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-surface-interactive text-surface-text border border-surface-border-subtle">
                {badge}
              </span>
            )}
          </div>
          <span className="text-[10px] text-surface-text-disabled flex-shrink-0 font-medium group-hover:text-surface-text-muted transition-colors">{timeAgo}</span>
        </div>
        <p className="text-[13px] text-surface-text-muted leading-relaxed break-words overflow-hidden">
          {body}
        </p>
      </div>
    </div>
  )
}
