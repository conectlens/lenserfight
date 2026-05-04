import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import { Avatar, Button, Card } from '@lenserfight/ui/components'
import { TextArea } from '@lenserfight/ui/forms'
import { useBattleComments, usePostComment, useScrollAnchor } from '../../hooks/realtime/useBattleComments'
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
  <div className="flex items-start gap-3 py-2.5 px-3 hover:bg-surface-raised/50 transition-colors rounded-xl group border-b border-surface-border-subtle last:border-0">
    <Avatar
      src={comment.lenser_avatar_url ?? undefined}
      alt={comment.lenser_display_name ?? comment.lenser_handle ?? '?'}
      className="!w-8 !h-8 rounded-full flex-shrink-0 mt-0.5 border border-surface-border shadow-sm"
    />
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between gap-2 max-w-full">
        <span className="text-[13px] font-bold text-surface-text truncate pr-2">
          {comment.lenser_display_name ?? comment.lenser_handle ?? 'Lenser'}
        </span>
        <span className="text-[10px] font-medium text-surface-text-disabled group-hover:text-surface-text-muted transition-colors whitespace-nowrap">
          {formatRelative(comment.created_at)}
        </span>
      </div>
      <p className="text-[13px] text-surface-text-muted break-words mt-0.5 leading-relaxed">
        {comment.body}
      </p>
    </div>
  </div>
)

export const BattleChatPanel: React.FC<BattleChatPanelProps> = ({ battleId, currentUserId }) => {
  const { data: comments = [], isLoading, hasMore, isLoadingMore, loadMore } = useBattleComments(battleId)
  const { mutate: postComment, isPending: isSending } = usePostComment(battleId)
  const [draft, setDraft] = useState('')

  // Scroll-anchor: prevents viewport from jumping when older comments are prepended
  const { ref: listRef, captureScrollHeight } = useScrollAnchor(comments.length)

  // Track whether the initial scroll-to-bottom has fired
  const hasInitialScrolled = useRef(false)

  // Initial scroll to bottom before paint (no flash)
  useLayoutEffect(() => {
    if (!hasInitialScrolled.current && comments.length > 0 && listRef.current) {
      hasInitialScrolled.current = true
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [comments.length])

  // Subsequent live comments: scroll to bottom when a new one is appended
  const prevLengthRef = useRef(comments.length)
  useEffect(() => {
    const prev = prevLengthRef.current
    prevLengthRef.current = comments.length
    if (hasInitialScrolled.current && comments.length > prev && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [comments.length])

  const handleLoadMore = () => {
    captureScrollHeight()
    loadMore()
  }

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
    <Card className="flex flex-col flex-1 h-full min-h-[300px] border border-surface-border-subtle shadow-sm bg-surface-base rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-surface-border-subtle bg-surface-base z-10">
        <MessageCircle size={16} className="text-surface-text-muted flex-shrink-0" />
        <h3 className="text-[13px] font-bold text-surface-text tracking-tight uppercase">Discussion</h3>
        {comments.length > 0 && (
          <span className="ml-auto text-[11px] font-bold text-surface-text-muted bg-surface-interactive px-2 py-0.5 rounded-full">{comments.length}</span>
        )}
      </div>

      {/* Comment list */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto overscroll-contain scroll-smooth p-2 bg-surface-raised/30"
      >
        {/* Load earlier button */}
        {hasMore && !isLoading && (
          <div className="pb-3 flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="px-3 py-1.5 rounded-full bg-surface-interactive text-[10px] font-bold text-surface-text-muted hover:text-surface-text transition-colors disabled:opacity-40 uppercase tracking-widest"
            >
              {isLoadingMore ? 'Loading…' : 'Load earlier'}
            </button>
          </div>
        )}

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
        <div className="flex items-center gap-2 p-3 border-t border-surface-border-subtle bg-surface-base z-10 mt-auto">
          <div className="flex items-center gap-2 flex-1 bg-surface-interactive rounded-xl px-3 py-1 border border-surface-border transition-colors focus-within:border-primary-yellow-500 focus-within:ring-1 focus-within:ring-primary-yellow-500">
            <TextArea
              minRows={1}
              maxRows={3}
              autoResize={false}
              maxLength={1000}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment…"
              className="flex-1 bg-transparent border-none focus:ring-0 shadow-none text-sm px-0 py-2.5 resize-none"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleSend}
              disabled={!draft.trim() || isSending}
              isLoading={isSending}
              className="!w-8 !h-8 !p-0 flex-shrink-0 rounded-lg bg-primary-yellow-500 text-dark-900 hover:brightness-105 active:scale-95 transition-all shadow-sm"
              title="Send"
            >
              <Send size={13} className={isSending ? 'opacity-0' : 'opacity-100'} />
            </Button>
          </div>
        </div>
      ) : (
        <p className="p-4 border-t border-surface-border-subtle bg-surface-base text-[11px] font-medium text-surface-text-muted text-center mt-auto">
          <a href="/auth/login" className="text-primary hover:underline font-bold mr-1">Sign in</a> 
          to join the discussion
        </p>
      )}
    </Card>
  )
}
