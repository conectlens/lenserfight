import { Globe, Lock } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

import { Button } from '@lenserfight/ui/components'
import { Modal } from '@lenserfight/ui/modals'
import { RichMentionInput, RichMentionInputHandle } from '@lenserfight/ui/forms'
import { SelectField } from '@lenserfight/ui/forms'
import { promptsService } from '@lenserfight/data/repositories'
import { tagService } from '@lenserfight/data/repositories'
import { PromptTemplateViewModel, TagUsage } from '@lenserfight/types'
import { Visibility } from '@lenserfight/types'
import { useCreateThread } from '../hooks/useCreateThread'

import { MentionAutocompleteList } from './MentionAutocompleteList'
import { TagMentionAutocompleteList } from './TagMentionAutocompleteList'

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
  const [visibility, setVisibility] = useState<Visibility>('public')

  const editorRef = useRef<RichMentionInputHandle>(null)

  // Prompt (@) mention state
  const [mentionQuery, setMentionQuery] = useState('')
  const [suggestions, setSuggestions] = useState<PromptTemplateViewModel[]>([])
  const [isMentioning, setIsMentioning] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const [activeIndex, setActiveIndex] = useState(0)

  // Tag (#) mention state
  const [tagMentionQuery, setTagMentionQuery] = useState('')
  const [tagSuggestions, setTagSuggestions] = useState<TagUsage[]>([])
  const [isTagMentioning, setIsTagMentioning] = useState(false)
  const [tagMenuPos, setTagMenuPos] = useState({ top: 0, left: 0 })
  const [tagActiveIndex, setTagActiveIndex] = useState(0)

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title)
        setContent(initialData.content)
        setVisibility(initialData.visibility)
      } else {
        setTitle('')
        setContent('')
        setVisibility('public')
      }
    }
  }, [isOpen, initialData])

  // Prompt mention suggestions
  useEffect(() => {
    if (!isMentioning || !mentionQuery) {
      setSuggestions([])
      return
    }

    let cancelled = false

    const timer = setTimeout(async () => {
      try {
        const results = await promptsService.search(mentionQuery)
        if (!cancelled) {
          setSuggestions((results.data ?? []).slice(0, 5))
          setActiveIndex(0)
        }
      } catch (e) {
        if (!cancelled) console.error(e)
      }
    }, 500)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [mentionQuery, isMentioning])

  // Tag mention suggestions
  useEffect(() => {
    if (!isTagMentioning || !tagMentionQuery || tagMentionQuery.length < 1) {
      setTagSuggestions([])
      return
    }

    let cancelled = false

    const timer = setTimeout(async () => {
      try {
        const results = await tagService.searchTags(tagMentionQuery)
        if (!cancelled) {
          setTagSuggestions(results)
          setTagActiveIndex(0)
        }
      } catch (e) {
        if (!cancelled) console.error(e)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [tagMentionQuery, isTagMentioning])

  const extractTagIds = (raw: string): string[] =>
    [...raw.matchAll(/#\[Tag:([^\]]+)\]/g)].map((m) => m[1])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return

    await createThread(
      title,
      content,
      extractTagIds(content),
      visibility,
      (id) => {
        onSuccess(id)
        onClose()
      },
      initialData?.id
    )
  }

  const handleTagCreate = async (name: string) => {
    try {
      const tag = await tagService.processUserInput(name)
      if (tag && editorRef.current) {
        editorRef.current.insertTag({ id: tag.id, name: tag.name, count: 0 })
      }
    } catch (e) {
      console.error(e)
    }
    setIsTagMentioning(false)
    setTagSuggestions([])
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

  const handleTagSelect = (tag: TagUsage) => {
    if (editorRef.current) {
      editorRef.current.insertTag(tag)
    }
    setIsTagMentioning(false)
    setTagSuggestions([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Tag mention keyboard nav takes priority
    if (isTagMentioning) {
      if (tagSuggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setTagActiveIndex((prev) => (prev + 1) % tagSuggestions.length)
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setTagActiveIndex((prev) => (prev - 1 + tagSuggestions.length) % tagSuggestions.length)
        } else if (e.key === 'Enter') {
          e.preventDefault()
          handleTagSelect(tagSuggestions[tagActiveIndex])
        } else if (e.key === 'Escape') {
          e.preventDefault()
          setIsTagMentioning(false)
          setTagSuggestions([])
        }
      } else if (tagMentionQuery && e.key === 'Enter') {
        e.preventDefault()
        handleTagCreate(tagMentionQuery)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setIsTagMentioning(false)
      }
      return
    }

    // Prompt mention keyboard nav
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
                  // Close tag menu
                  setIsTagMentioning(false)
                  setTagSuggestions([])
                }}
                onMentionClose={() => {
                  setIsMentioning(false)
                  setSuggestions([])
                }}
                onTagSearch={(query, coords) => {
                  setTagMentionQuery(query)
                  setTagMenuPos(coords)
                  setIsTagMentioning(true)
                  // Close prompt menu
                  setIsMentioning(false)
                  setSuggestions([])
                }}
                onTagClose={() => {
                  setIsTagMentioning(false)
                  setTagSuggestions([])
                }}
                placeholder="What's on your mind? Type @ to link a prompt, # to mention or create a tag..."
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

              {isTagMentioning &&
                (tagSuggestions.length > 0 || tagMentionQuery) &&
                createPortal(
                  <TagMentionAutocompleteList
                    visible={isTagMentioning}
                    suggestions={tagSuggestions}
                    activeIndex={tagActiveIndex}
                    position={tagMenuPos}
                    onSelect={handleTagSelect}
                    createQuery={tagMentionQuery}
                    onCreate={handleTagCreate}
                  />,
                  document.body
                )}
            </div>
          </div>
        </div>

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
