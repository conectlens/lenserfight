import { Globe, Lock } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

import { Button } from '../../../components/Button'
import { Modal } from '../../../components/Modal'
import { RichMentionInput, RichMentionInputHandle } from '../../../components/RichMentionInput'
import { SelectField } from '../../../components/SelectField'
import { promptsService } from '../../../services/promptsService'
import { PromptTemplateViewModel } from '../../../types/prompts.types'
import { Visibility } from '../../../types/threads.types'
import { useCreateThread } from '../hooks/useCreateThread'

import { MentionAutocompleteList } from './MentionAutocompleteList'
import { ThreadTagInput } from './ThreadTagInput'

interface CreateThreadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (id?: string) => void
  initialData?: {
    id: string
    title: string
    content: string
    tags: string[]
    visibility: Visibility
  } | null
}

export const CreateThreadModal: React.FC<CreateThreadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const { createThread, isSubmitting, error } = useCreateThread()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [visibility, setVisibility] = useState<Visibility>('public')

  const editorRef = useRef<RichMentionInputHandle>(null)
  const [mentionQuery, setMentionQuery] = useState('')
  const [suggestions, setSuggestions] = useState<PromptTemplateViewModel[]>([])
  const [isMentioning, setIsMentioning] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title)
        setContent(initialData.content)
        setTags(initialData.tags || [])
        setVisibility(initialData.visibility)
      } else {
        setTitle('')
        setContent('')
        setTags([])
        setVisibility('public')
      }
    }
  }, [isOpen, initialData])

  useEffect(() => {
    if (!isMentioning) {
      setSuggestions([])
      return
    }

    if (!mentionQuery) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        const results = await promptsService.search(mentionQuery)
        setSuggestions(results.slice(0, 5))
        setActiveIndex(0)
      } catch (e) {
        console.error(e)
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [mentionQuery, isMentioning])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return

    await createThread(
      title,
      content,
      tags,
      visibility,
      (id) => {
        onSuccess(id)
        onClose()
      },
      initialData?.id
    )
  }

  const handleClose = () => {
    if (!isSubmitting) onClose()
  }

  const handleMentionSelect = (prompt: PromptTemplateViewModel) => {
    if (editorRef.current) {
      editorRef.current.insertMention(prompt)
    }
    setIsMentioning(false)
    setSuggestions([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isMentioning && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((prev) => (prev + 1) % suggestions.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleMentionSelect(suggestions[activeIndex])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setIsMentioning(false)
      }
    }
  }

  const visibilityOptions = [
    { value: 'public', label: 'Public', icon: Globe },
    { value: 'private', label: 'Private', icon: Lock },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={initialData ? 'Edit Post' : 'Create New Post'}
    >
      <form onSubmit={handleSubmit} className="space-y-6" onKeyDown={handleKeyDown}>
        <div className="space-y-4">
          <div className="space-y-4">
            <label className="text-base font-semibold text-gray-900 dark:text-gray-100 block">
              Content
            </label>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title your thread..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all font-medium text-lg"
              required
              autoFocus
            />

            <div className="relative">
              <RichMentionInput
                ref={editorRef}
                value={content}
                onChange={setContent}
                onMentionSearch={(query, coords) => {
                  setMentionQuery(query)
                  setMenuPos(coords)
                  setIsMentioning(true)
                }}
                onMentionClose={() => {
                  setIsMentioning(false)
                  setSuggestions([])
                }}
                placeholder="What's on your mind? Type @ to link a prompt..."
              />

              {isMentioning &&
                suggestions.length > 0 &&
                createPortal(
                  <MentionAutocompleteList
                    visible={isMentioning}
                    suggestions={suggestions}
                    activeIndex={activeIndex}
                    position={menuPos}
                    onSelect={handleMentionSelect}
                  />,
                  document.body
                )}
            </div>
          </div>
        </div>

        <ThreadTagInput tags={tags} onChange={setTags} />

        <div className="space-y-2">
          <SelectField
            label="Visibility"
            value={visibility}
            onChange={(val) => setVisibility(val as Visibility)}
            options={visibilityOptions}
            className="w-full"
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
            className="bg-gray-100 dark:bg-gray-700 border-transparent hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {initialData ? 'Update' : 'Publish'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
