import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLenserChat, usePostLenserMessage, useChatScrollAnchor } from '../hooks/useLenserChat'
import type { RealtimeStatus } from '../hooks/useLenserChat'
import { ChatMessage } from './ChatMessage'
import { Badge } from '@lenserfight/ui/components'

interface LenserChatRailProps {
  battleId?: string
  currentUserId?: string
  currentHandle?: string
  senderRole?: 'viewer' | 'lenser'
  isAuthenticated: boolean
  /** Override outer wrapper classes. Defaults to `w-72 flex-shrink-0` for the desktop rail. */
  className?: string
}

const LiveIndicator: React.FC<{ status: RealtimeStatus }> = ({ status }) => {
  if (status === 'live') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Live</span>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-yellow-400" />
        <span className="text-[10px] font-semibold text-yellow-400 uppercase tracking-wider">Reconnecting…</span>
      </div>
    )
  }
  // connecting
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-surface-text-disabled animate-pulse" />
      <span className="text-[10px] font-semibold text-surface-text-disabled uppercase tracking-wider">Connecting…</span>
    </div>
  )
}

export const LenserChatRail: React.FC<LenserChatRailProps> = ({
  battleId,
  currentUserId,
  currentHandle,
  senderRole = 'viewer',
  isAuthenticated,
  className,
}) => {
  const { messages, realtimeStatus, hasMore, isLoadingMore, loadMore } = useLenserChat(battleId)
  const postMessage = usePostLenserMessage(battleId)
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll-anchor: prevents jump when older messages are prepended
  const { ref: scrollRef, captureScrollHeight } = useChatScrollAnchor(messages.length)

  // Track whether the initial scroll-to-bottom has fired
  const hasInitialScrolled = useRef(false)

  // Reset on battleId change so next battle also starts at bottom
  useLayoutEffect(() => {
    hasInitialScrolled.current = false
  }, [battleId])

  // Scroll to bottom on initial load (unconditional); for subsequent live messages only if near bottom
  const prevLengthRef = useRef(messages.length)
  useEffect(() => {
    const prev = prevLengthRef.current
    prevLengthRef.current = messages.length
    if (messages.length > prev && scrollRef.current) {
      if (!hasInitialScrolled.current) {
        hasInitialScrolled.current = true
        bottomRef.current?.scrollIntoView({ behavior: 'instant' })
      } else {
        const el = scrollRef.current
        const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
        if (isNearBottom) {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
      }
    }
  }, [messages.length])

  const handleLoadMore = () => {
    captureScrollHeight()
    loadMore()
  }

  const handleSend = () => {
    const body = draft.trim()
    if (!body || !currentUserId || !currentHandle) return
    setDraft('')
    postMessage.mutate({ senderId: currentUserId, senderHandle: currentHandle, senderRole, body })
  }

  return (
    <div className={`flex flex-col border-l border-surface-border bg-surface-sunken ${className ?? 'w-72 flex-shrink-0'}`}>
      {/* Header */}
      <div className="flex-shrink-0 h-14 flex items-center justify-between px-4 border-b border-surface-border">
        <span className="text-xs font-bold text-surface-text-muted uppercase tracking-wider">Lenser Chat</span>
        <LiveIndicator status={realtimeStatus} />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {/* Load earlier button */}
        {hasMore && (
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="w-full py-2 text-[11px] text-surface-text-muted hover:text-surface-text disabled:opacity-40 border-b border-surface-border"
          >
            {isLoadingMore ? 'Loading…' : 'Load earlier messages'}
          </button>
        )}

        {messages.length === 0 && (
          <div className="flex items-center justify-center h-32 text-xs text-surface-text-disabled">
            No messages yet. Be the first!
          </div>
        )}
        {messages.map((m) => (
          <ChatMessage
            key={m.id}
            senderHandle={m.sender_handle}
            senderRole={m.sender_role as 'viewer' | 'lenser' | 'moderator' | 'system'}
            body={m.body}
            createdAt={m.created_at}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-surface-border px-3 py-2.5">
        {isAuthenticated ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder="Say something…"
                maxLength={300}
                className="flex-1 bg-transparent text-xs text-surface-text placeholder:text-surface-text-disabled outline-none"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!draft.trim()}
                className="text-xs font-semibold text-primary disabled:opacity-40"
              >
                Send
              </button>
            </div>
            {draft.length > 0 && (
              <span className="text-[10px] text-surface-text-disabled text-right tabular-nums">
                {draft.length}/300
              </span>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-surface-text-muted dark:text-surface-text-disabled text-center flex items-center justify-center gap-1.5">
            <Link to="/auth/login" className="hover:opacity-80 transition-opacity">
              <Badge color="gray" size="sm" className="font-semibold cursor-pointer">Sign in</Badge>
            </Link>
            <span>to chat</span>
          </p>
        )}
      </div>
    </div>
  )
}
