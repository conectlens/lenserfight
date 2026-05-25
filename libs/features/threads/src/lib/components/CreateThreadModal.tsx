import { Globe, Lock, Copy, Check } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

import { Dialog, ModalFooter } from '@lenserfight/ui/overlays'
import { RichMentionInput, RichMentionInputHandle } from '@lenserfight/ui/forms'
import { SelectField } from '@lenserfight/ui/forms'
import { lensesService } from '@lenserfight/data/repositories'
import { tagService } from '@lenserfight/data/repositories'
import { LensViewModel, TagUsage } from '@lenserfight/types'
import { Visibility } from '@lenserfight/types'
import { useCreateThread } from '../hooks/useCreateThread'
import { ThreadMediaPicker, type PendingThreadMedia } from './ThreadMediaPicker'
import type { MediaObject } from '@lenserfight/types'

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
  initialContent?: string
}

export const CreateThreadModal: React.FC<CreateThreadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  initialContent,
}) => {
  const { createThread, isSubmitting, error } = useCreateThread()
  const [lensInstructionsCopied, setLensInstructionsCopied] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [pendingMedia, setPendingMedia] = useState<PendingThreadMedia | null>(null)

  const editorRef = useRef<RichMentionInputHandle>(null)

  // Prompt (@) mention state
  const [mentionQuery, setMentionQuery] = useState('')
  const [suggestions, setSuggestions] = useState<LensViewModel[]>([])
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
        setContent(initialContent ?? '')
        setVisibility('public')
      }
      setPendingMedia(null)
    }
  }, [isOpen, initialData, initialContent])

  // Prompt mention suggestions
  useEffect(() => {
    if (!isMentioning || !mentionQuery) {
      setSuggestions([])
      return
    }

    let cancelled = false

    const timer = setTimeout(async () => {
      try {
        const results = await lensesService.search(mentionQuery)
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
      initialData?.id,
      pendingMedia
    )
  }

  const handleTagCreate = async (name: string) => {
    try {
      const tag = await tagService.processUserInput(name)
      if (tag && editorRef.current) {
        editorRef.current.insertTag({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          visibility: tag.visibility,
          created_at: new Date().toISOString(),
          count: 0,
          trendingScore: 0,
        })
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

  const handleMentionSelect = (prompt: LensViewModel) => {
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

  const LENS_CREATION_INSTRUCTIONS = `# How to Create a Lens on LenserFight

A **Lens** is a reusable AI prompt template that others can run, fork, and build battles around.

## Required fields

| Field | Description |
|-------|-------------|
| **Title** | Short, descriptive name (e.g. "Blog Post Outliner") |
| **Description** | One-sentence summary of what the Lens does |
| **Template body** | The prompt text. Use \`[[Parameter Label]]\` tokens for dynamic inputs |
| **Visibility** | \`public\` (discoverable), \`community\` (logged-in users only), or \`private\` |
| **Tags** | Up to 5 tags to help users find your Lens |

## Template body tips

- Write your prompt as if speaking directly to the AI model.
- Wrap dynamic inputs in double brackets: \`[[Topic]]\`, \`[[Tone]]\`, \`[[Word Count]]\`.
- Each \`[[Label]]\` automatically becomes a typed parameter users fill in before running.
- Keep the core instruction clear even when all parameters are at their defaults.

## Parameter types you can declare

\`text\` · \`textarea\` · \`number\` · \`boolean\` · \`select\` · \`multiselect\` · \`url\` · \`date\` · \`file\`

## Example Lens

**Title:** Blog Post Outliner
**Description:** Generates a structured outline for any blog topic.
**Template body:**
\`\`\`
You are an expert content strategist.

Create a detailed blog post outline for the topic: [[Topic]]

Tone: [[Tone]]
Target word count: [[Word Count]]
Audience: [[Target Audience]]

Return the outline as a numbered list with H2 and H3 headings.
\`\`\`

**Tags:** writing, content, blogging, outlines
**Visibility:** public

## Publishing checklist

- [ ] Title is unique and searchable
- [ ] Description explains the outcome, not the mechanism
- [ ] All \`[[tokens]]\` have clear, concise labels
- [ ] Template works well with default / empty parameter values
- [ ] At least one relevant tag added
- [ ] Visibility set to \`public\` for maximum reach

Paste this template into any AI provider (ChatGPT, Claude, Gemini, etc.), fill in the fields, and submit the output as your new Lens on LenserFight.`

  const handleCopyLensInstructions = async () => {
    try {
      await navigator.clipboard.writeText(LENS_CREATION_INSTRUCTIONS)
      setLensInstructionsCopied(true)
      setTimeout(() => setLensInstructionsCopied(false), 2000)
    } catch (e) {
      console.error('Failed to copy lens instructions', e)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      title={initialData ? 'Edit Post' : 'Create New Post'}
      maxWidth="max-w-3xl"
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

        <div>
          <ThreadMediaPicker
            pending={pendingMedia}
            onFileSelect={(file) => setPendingMedia({ kind: 'file', file })}
            onGallerySelect={(mediaObject: MediaObject) => setPendingMedia({ kind: 'object', mediaObject })}
            onClear={() => setPendingMedia(null)}
          />
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

        <ModalFooter
          leftButton={{ label: 'Cancel', onClick: handleClose, disabled: isSubmitting, variant: 'secondary' }}
          primaryButton={{ label: initialData ? 'Update' : 'Publish', type: 'submit', isLoading: isSubmitting }}
        />
      </form>
    </Dialog>
  )
}
