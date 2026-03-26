import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'
import { useBattleComments, usePostComment } from '../hooks/useBattleComments'
import { ChatMessage } from './ChatMessage'

interface LenserChatPanelProps {
  battleId?: string
  currentUserId?: string
  lenserId?: string
  lenserHandle?: string
  isLenser: boolean
  collapsed: boolean
  onToggle: () => void
}

export const LenserChatPanel: React.FC<LenserChatPanelProps> = ({
  battleId,
  lenserId,
  lenserHandle,
  isLenser,
  collapsed,
  onToggle,
}) => {
  const { data: comments = [] } = useBattleComments(battleId)
  const postComment = usePostComment(battleId)
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  const handleSend = () => {
    const body = draft.trim()
    if (!body || !lenserId) return
    setDraft('')
    postComment.mutate({ lenserId, body })
  }

  return (
    <div
      className={`flex-shrink-0 border-t border-surface-border bg-surface-sunken transition-all duration-300 ${
        collapsed ? 'h-10' : 'h-48'
      }`}
    >
      {/* Toggle bar */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full h-10 flex items-center gap-2 px-4 text-xs font-semibold text-surface-text-muted hover:text-surface-text transition-colors"
      >
        <MessageSquare size={13} />
        Lenser Chat
        <span className="ml-auto">
          {collapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </button>

      {!collapsed && (
        <div className="flex flex-col h-[calc(100%-2.5rem)]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            {comments.map((c) => (
              <ChatMessage
                key={c.id}
                senderHandle={c.lenser_handle ?? 'lenser'}
                senderRole="lenser"
                body={c.body}
                createdAt={c.created_at}
                avatarUrl={c.lenser_avatar_url}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {isLenser ? (
            <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-t border-surface-border">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder="Message lensers…"
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
          ) : (
            <div className="flex-shrink-0 px-3 py-2 border-t border-surface-border text-[11px] text-surface-text-disabled">
              You need a Lenser profile to post here.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
