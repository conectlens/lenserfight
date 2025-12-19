import { MessageSquare, Tag, CheckCircle } from 'lucide-react'
import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'

import { Button } from '../../../components/Button'
import { FormError } from '../../../components/FormError'
import { Modal } from '../../../components/Modal'
import { useAuth } from '../../../context/AuthContext'
import { feedbackService } from '../../../services/feedbackService'
import { ProductTag } from '../../../types/feedback.types'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

const TAG_OPTIONS: { value: ProductTag; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'ui_ux', label: 'UI/UX' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Other' },
]

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const location = useLocation()
  const { user } = useAuth()

  const [productTag, setProductTag] = useState<string>('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleClose = () => {
    onClose()
    setTimeout(() => {
      setProductTag('')
      setMessage('')
      setError(null)
      setSuccess(false)
      setIsLoading(false)
    }, 300)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!message.trim()) {
      setError('Please enter a message describing your feedback.')
      return
    }

    setIsLoading(true)

    try {
      await feedbackService.submitFeedback({
        product_tag: (productTag as ProductTag) || undefined,
        page: location.pathname,
        user_id: user?.id || null,
        message: message,
        start_date: null,
        end_date: null,
      })
      setIsLoading(false)
      setSuccess(true)

      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback. Please try again.')
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Feedback Sent">
        <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
            <CheckCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Thank You!</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
            Your feedback has been received and helps us improve the platform.
          </p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Send Feedback">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Topic Selection */}
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Tag size={12} /> Topic
          </label>
          <div className="relative">
            <select
              value={productTag}
              onChange={(e) => setProductTag(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none appearance-none cursor-pointer"
            >
              <option value="" disabled className="text-gray-500 dark:text-gray-400">
                Select a topic...
              </option>
              {TAG_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                >
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 dark:text-gray-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <MessageSquare size={12} /> Message <span className="text-red-500">*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="What's on your mind? Describe the issue or idea..."
            className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none ${!message && error ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
          />
          <div className="flex justify-end mt-1">
            <span
              className={`text-[10px] ${message.length > 2000 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}
            >
              {message.length}/2000
            </span>
          </div>
        </div>

        {error && <FormError message={error} />}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Submit Feedback
          </Button>
        </div>
      </form>
    </Modal>
  )
}
