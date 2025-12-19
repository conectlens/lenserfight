import React, { useState } from 'react'

import { Avatar } from '../../../components/Avatar'
import { Button } from '../../../components/Button'
import { useLenser } from '../../../context/LenserContext'

interface ReplyComposerProps {
  onSubmit: (content: string) => Promise<void>
  placeholder?: string
  autoFocus?: boolean
  onCancel?: () => void
}

export const ReplyComposer: React.FC<ReplyComposerProps> = ({
  onSubmit,
  placeholder,
  autoFocus,
  onCancel,
}) => {
  const { lenser } = useLenser()
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim()) return
    setIsSubmitting(true)
    try {
      await onSubmit(content)
      setContent('')
      if (onCancel) onCancel()
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!lenser) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Please sign in to join the conversation.
        </p>
      </div>
    )
  }

  return (
    <div className="flex gap-4 items-start">
      <div className="hidden sm:block flex-shrink-0">
        <Avatar src={lenser.avatar_url} size="md" />
      </div>
      <div className="flex-1">
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder || 'Add a reply...'}
            autoFocus={autoFocus}
            rows={3}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none text-sm text-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
          />
        </div>
        <div className="flex justify-end gap-2 mt-2">
          {onCancel && (
            <Button
              variant="ghost"
              onClick={onCancel}
              className="w-auto px-4 py-1.5 h-auto text-sm"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!content.trim()}
            isLoading={isSubmitting}
            className="w-auto px-4 py-1.5 h-auto text-sm shadow-sm"
          >
            Reply
          </Button>
        </div>
      </div>
    </div>
  )
}
