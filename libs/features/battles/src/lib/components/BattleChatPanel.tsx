import React, { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import { Avatar, Button, Card } from '@lenserfight/ui/components'
import { TextArea } from '@lenserfight/ui/forms'
import { useBattleComments, usePostComment } from '../hooks/useBattleComments'
import type { BattleCommentRecord } from '@lenserfight/data/repositories'

interface BattleChatPanelProps {
  battleId: string
  currentUserId?: string
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString()
}

const CommentRow: React.FC<{ comment: BattleCommentRecord }> = ({ comment }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-surface-border last:border-0">
    <Avatar
      src={comment.lenser_avatar_url ?? undefined}
      alt={comment.lenser_display_name ?? comment.lenser_handle ?? '?'}
      className="!w-7 !h-7 rounded-full flex-shrink-0 mt-0.5"
    />
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-xs font-semibold text-greyscale-800 dark:text-greyscale-100">
          {comment.lenser_display_name ?? comment.lenser_handle ?? 'Lenser'}
        </span>
        <span className="text-[11px] text-greyscale-400 dark:text-greyscale-500">
          {formatRelative(comment.created_at)}
        </span>
      </div>
      <p className="text-sm text-greyscale-700 dark:text-greyscale-300 break-words mt-0.5 leading-snug">
        {comment.body}
      </p>
    </div>
  </div>
)

export const BattleChatPanel: React.FC<BattleChatPanelProps> = ({ battleId, currentUserId }) => {
  const { data: comments = [], isLoading } = useBattleComments(battleId)
  const { mutate: postComment, isPending: isSending } = usePostComment(battleId)
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [comments.length])

  const handleSend = () => {
    const body = draft.trim()
    if (!body || !currentUserId || isSending) return
    postComment({ lenserId: currentUserId, body })
    setDraft('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Card className="space-y-3 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <MessageCircle size={15} className="text-greyscale-500 flex-shrink-0" />
        <h3 className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">Discussion</h3>
        {comments.length > 0 && (
          <span className="ml-auto text-xs text-greyscale-400">{comments.length}</span>
        )}
      </div>

      {/* Comment list */}
      <div
        ref={listRef}
        className="max-h-72 overflow-y-auto overscroll-contain scroll-smooth pr-1"
      >
        {isLoading && (
          <div className="space-y-3 animate-pulse py-2">
            {[1, 2].map((n) => (
              <div key={n} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-surface-raised flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-24 rounded bg-surface-raised" />
                  <div className="h-2.5 w-48 rounded bg-surface-raised" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!isLoading && comments.length === 0 && (
          <p className="py-4 text-center text-sm text-greyscale-400 dark:text-greyscale-500">
            No comments yet. Be the first to weigh in.
          </p>
        )}
        {!isLoading && comments.map((c) => <CommentRow key={c.id} comment={c} />)}
      </div>

      {/* Input */}
      {currentUserId ? (
        <div className="flex items-end gap-2 pt-1 border-t border-surface-border">
          <TextArea
            minRows={2}
            maxRows={4}
            autoResize={false}
            maxLength={1000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment… (Enter to send)"
            className="flex-1"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            disabled={!draft.trim() || isSending}
            isLoading={isSending}
            className="!w-9 !h-9 !p-0 flex-shrink-0"
            title="Send"
          >
            <Send size={14} />
          </Button>
        </div>
      ) : (
        <p className="pt-1 border-t border-surface-border text-sm text-greyscale-400 dark:text-greyscale-500 text-center">
          Sign in to join the discussion.
        </p>
      )}
    </Card>
  )
}
