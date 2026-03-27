import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLenserChat, usePostLenserMessage, useChatScrollAnchor } from '../hooks/useLenserChat'
import type { RealtimeStatus } from '../hooks/useLenserChat'
import { ChatMessage } from './ChatMessage'
import { Badge, Button } from '@lenserfight/ui/components'

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
      <span className="h-1.5 w-1.5 rounded-full bg-surface-text-disabled animate-pulse" />
      <span className="text-[9px] font-bold text-surface-text-disabled uppercase tracking-widest">Connecting</span>
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
    <div className={`flex flex-col border-l border-surface-border-subtle bg-surface-base shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-20 ${className ?? 'w-72 lg:w-80 flex-shrink-0'}`}>
      {/* Header */}
      <div className="flex-shrink-0 h-14 flex items-center justify-between px-5 border-b border-surface-border-subtle bg-surface-base">
        <span className="text-[11px] font-bold text-surface-text uppercase tracking-widest flex items-center gap-2">
          Lenser Chat
        </span>
        <LiveIndicator status={realtimeStatus} />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-2 scroll-smooth bg-surface-raised min-h-[300px]">
        {/* Load earlier button */}
        {hasMore && (
          <div className="pb-3 flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="!rounded-full !text-[10px] !font-bold !text-surface-text-muted hover:!text-surface-text !uppercase !tracking-widest !px-3 !py-1.5 !bg-surface-interactive"
            >
              {isLoadingMore ? 'Loading…' : 'Load earlier'}
            </Button>
          </div>
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
      <div className="flex-shrink-0 border-t border-surface-border-subtle px-4 py-3 bg-surface-base">
        {isAuthenticated ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-surface-interactive rounded-xl px-3 py-2 border border-surface-border transition-colors focus-within:border-primary-yellow-500 focus-within:ring-1 focus-within:ring-primary-yellow-500">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder="Say something…"
                maxLength={300}
                className="flex-1 bg-transparent text-sm text-surface-text placeholder:text-surface-text-disabled outline-none py-1"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSend}
                disabled={!draft.trim()}
                className="!text-[11px] !font-black !text-dark-900 !bg-primary-yellow-500 !px-3 !py-1.5 !rounded-lg !uppercase !tracking-wider hover:!brightness-105 active:!scale-95"
              >
                Send
              </Button>
            </div>
            {draft.length > 0 && (
              <span className="text-[9px] text-surface-text-muted font-bold text-right tabular-nums px-1">
                {draft.length}/300
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-2">
            <p className="text-xs text-surface-text-muted font-medium flex items-center gap-2">
              <Link to="/auth/login" className="hover:scale-105 transition-transform">
                <Badge color="yellow" size="sm" className="font-bold cursor-pointer shadow-sm">Sign in</Badge>
              </Link>
              to join the chat
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
