import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGlobalChat, usePostGlobalMessage } from '../hooks/useGlobalChat'
import { ChatMessage } from './ChatMessage'
import { Badge } from '@lenserfight/ui/components'

interface GlobalChatRailProps {
  battleId?: string
  currentUserId?: string
  currentHandle?: string
  senderRole?: 'viewer' | 'lenser'
  isAuthenticated: boolean
}

export const GlobalChatRail: React.FC<GlobalChatRailProps> = ({
  battleId,
  currentUserId,
  currentHandle,
  senderRole = 'viewer',
  isAuthenticated,
}) => {
  const { messages } = useGlobalChat(battleId)
  const postMessage = usePostGlobalMessage(battleId)
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = () => {
    const body = draft.trim()
    if (!body || !currentUserId || !currentHandle) return
    setDraft('')
    postMessage.mutate({ senderId: currentUserId, senderHandle: currentHandle, senderRole, body })
  }

  return (
    <div className="w-72 flex-shrink-0 flex flex-col border-l border-surface-border bg-surface-sunken">
      {/* Header */}
      <div className="flex-shrink-0 h-14 flex items-center px-4 border-b border-surface-border">
        <span className="text-xs font-bold text-surface-text-muted uppercase tracking-wider">Live Chat</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
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
