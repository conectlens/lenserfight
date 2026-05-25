import React, { useRef, useEffect } from 'react'
import { mentionService, LenserSearchResult } from '@lenserfight/data/repositories'
import { LensViewModel, TagUsage } from '@lenserfight/types'

interface RichMentionInputProps {
  value: string // The tokenized value from parent
  onChange: (value: string) => void
  onMentionSearch: (query: string, coords: { top: number; left: number }) => void
  onMentionClose: () => void
  onTagSearch?: (query: string, coords: { top: number; left: number }) => void
  onTagClose?: () => void
  placeholder?: string
}

export interface RichMentionInputHandle {
  insertMention: (prompt: LensViewModel) => void
  insertUserMention: (user: LenserSearchResult) => void
  insertTag: (tag: TagUsage) => void
  focus: () => void
}

export const RichMentionInput = React.forwardRef<RichMentionInputHandle, RichMentionInputProps>(
  ({ value, onChange, onMentionSearch, onMentionClose, onTagSearch, onTagClose, placeholder }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const isTypingMention = useRef(false)
    const isTypingTag = useRef(false)
    // Initialize with empty string so that if initial value is provided, hydration triggers
    const lastKnownValue = useRef('')

    // Helper to get caret coordinates relative to the viewport
    const getCaretCoordinates = () => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return { top: 0, left: 0 }

      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      // Fallback if rect is empty (e.g. start of line)
      if (rect.width === 0 && rect.height === 0) {
        if (containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect()
          return {
            top: rect.top || containerRect.top + 10,
            left: rect.left || containerRect.left + 10,
            height: 20,
          }
        }
      }

      return {
        top: rect.top,
        left: rect.left,
        height: rect.height,
      }
    }

    // Hydrate content from value prop (Initial Load / External Reset)
    useEffect(() => {
      if (!containerRef.current) return

      // Reset case
      if (value === '') {
        if (containerRef.current.textContent !== '') {
          containerRef.current.innerHTML = ''
          lastKnownValue.current = ''
        }
        return
      }

      // Hydration Case: Container is empty (initial mount or manual clear) and we have a value.
      const isContainerEmpty = !containerRef.current.textContent?.trim()

      if (isContainerEmpty && value !== lastKnownValue.current) {
        hydrateContent(value)
      }
    }, [value])

    const hydrateContent = async (text: string) => {
      try {
        const segments = await mentionService.resolveContent(text)
        if (!containerRef.current) return

        containerRef.current.innerHTML = ''

        segments.forEach((segment) => {
          if (segment.type === 'text') {
            if (segment.content) {
              containerRef.current?.appendChild(document.createTextNode(segment.content))
            }
          } else if (segment.type === 'mention' && segment.entityType === 'User' && segment.id) {
            const chip = createUserChip(segment.id, segment.content || segment.id)
            containerRef.current?.appendChild(chip)
          } else if (segment.type === 'mention' && segment.id) {
            const chip = createPromptChip(segment.id, segment.content || 'Unknown Prompt')
            containerRef.current?.appendChild(chip)
          } else if (segment.type === 'tag' && segment.id) {
            const chip = createTagChip(segment.id, segment.content || segment.id)
            containerRef.current?.appendChild(chip)
          }
        })

        lastKnownValue.current = text
      } catch (e) {
        console.error('Failed to hydrate rich content', e)
        if (containerRef.current) {
          containerRef.current.innerText = text
          lastKnownValue.current = text
        }
      }
    }

    const createPromptChip = (id: string, label: string): HTMLSpanElement => {
      const chip = document.createElement('span')
      chip.contentEditable = 'false'
      chip.className =
        'inline-flex items-center px-1.5 py-0.5 rounded mx-1 bg-primary/20 text-primary-900 font-medium text-sm select-none align-middle'
      chip.setAttribute('data-mention-id', id)
      chip.textContent = label
      return chip
    }

    const createTagChip = (id: string, label: string): HTMLSpanElement => {
      const chip = document.createElement('span')
      chip.contentEditable = 'false'
      chip.className =
        'inline-flex items-center px-1.5 py-0.5 rounded mx-1 bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 font-medium text-sm select-none align-middle'
      chip.setAttribute('data-tag-id', id)
      chip.textContent = `#${label}`
      return chip
    }

    const createUserChip = (id: string, handle: string): HTMLSpanElement => {
      const chip = document.createElement('span')
      chip.contentEditable = 'false'
      chip.className =
        'inline-flex items-center px-1.5 py-0.5 rounded mx-1 bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-300 font-medium text-sm select-none align-middle'
      chip.setAttribute('data-user-mention-id', id)
      chip.textContent = `@${handle}`
      return chip
    }

    const handleInput = () => {
      if (!containerRef.current) return

      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const textNode = range.startContainer

        if (textNode.nodeType === Node.TEXT_NODE) {
          const text = textNode.textContent || ''
          const caretPos = range.startOffset

          // Check for @ trigger (prompt mention)
          const lastAt = text.lastIndexOf('@', caretPos - 1)
          if (lastAt !== -1) {
            const isStart = lastAt === 0
            const isPrecededBySpace = !isStart && /[\s\u00A0]/.test(text[lastAt - 1])

            if (isStart || isPrecededBySpace) {
              const query = text.substring(lastAt + 1, caretPos)
              if (!/\s/.test(query)) {
                const coords = getCaretCoordinates()
                onMentionSearch(query, {
                  top: coords.top + (coords.height || 20),
                  left: coords.left,
                })
                isTypingMention.current = true
                // Close tag menu if open
                if (isTypingTag.current) {
                  onTagClose?.()
                  isTypingTag.current = false
                }
                serializeContent()
                return
              } else {
                onMentionClose()
                isTypingMention.current = false
              }
            } else {
              onMentionClose()
              isTypingMention.current = false
            }
          } else {
            onMentionClose()
            isTypingMention.current = false
          }

          // Check for # trigger (tag mention)
          if (onTagSearch) {
            const lastHash = text.lastIndexOf('#', caretPos - 1)
            if (lastHash !== -1) {
              const isStart = lastHash === 0
              const isPrecededBySpace = !isStart && /[\s\u00A0]/.test(text[lastHash - 1])

              if (isStart || isPrecededBySpace) {
                const query = text.substring(lastHash + 1, caretPos)
                if (!/\s/.test(query) && query.length >= 1) {
                  const coords = getCaretCoordinates()
                  onTagSearch(query, {
                    top: coords.top + (coords.height || 20),
                    left: coords.left,
                  })
                  isTypingTag.current = true
                  serializeContent()
                  return
                } else {
                  onTagClose?.()
                  isTypingTag.current = false
                }
              } else {
                onTagClose?.()
                isTypingTag.current = false
              }
            } else {
              onTagClose?.()
              isTypingTag.current = false
            }
          }
        }
      }

      serializeContent()
    }

    // Convert HTML back to tokenized string
    const serializeContent = () => {
      if (!containerRef.current) return

      let text = ''

      const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          text += node.textContent
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement
          if (el.hasAttribute('data-user-mention-id')) {
            const id = el.getAttribute('data-user-mention-id')
            text += `@[User:${id}]`
          } else if (el.hasAttribute('data-mention-id')) {
            const id = el.getAttribute('data-mention-id')
            text += `@[Prompt:${id}]`
          } else if (el.hasAttribute('data-tag-id')) {
            const id = el.getAttribute('data-tag-id')
            text += `#[Tag:${id}]`
          } else if (el.tagName === 'BR') {
            text += '\n'
          } else if (el.tagName === 'DIV') {
            text += '\n'
            el.childNodes.forEach(walk)
          } else {
            el.childNodes.forEach(walk)
          }
        }
      }

      containerRef.current.childNodes.forEach(walk)

      const cleanText = text.replace(/^\n+/, '')

      if (lastKnownValue.current !== cleanText) {
        lastKnownValue.current = cleanText
        onChange(cleanText)
      }
    }

    const insertMention = (prompt: LensViewModel) => {
      if (!containerRef.current) return

      const selection = window.getSelection()
      if (!selection) return
      const range = selection.getRangeAt(0)

      const textNode = range.startContainer
      if (textNode.nodeType === Node.TEXT_NODE) {
        const text = textNode.textContent || ''
        const caretPos = range.startOffset
        const lastAt = text.lastIndexOf('@', caretPos - 1)

        if (lastAt !== -1) {
          range.setStart(textNode, lastAt)
          range.setEnd(textNode, caretPos)
          range.deleteContents()
        }
      }

      const chip = createPromptChip(prompt.id, prompt.title)
      range.insertNode(chip)

      const space = document.createTextNode('\u00A0')
      range.setStartAfter(chip)
      range.insertNode(space)

      range.setStartAfter(space)
      range.setEndAfter(space)
      selection.removeAllRanges()
      selection.addRange(range)

      onMentionClose()
      isTypingMention.current = false
      serializeContent()
      containerRef.current.focus()
    }

    const insertUserMention = (user: LenserSearchResult) => {
      if (!containerRef.current) return

      const selection = window.getSelection()
      if (!selection) return
      const range = selection.getRangeAt(0)

      const textNode = range.startContainer
      if (textNode.nodeType === Node.TEXT_NODE) {
        const text = textNode.textContent || ''
        const caretPos = range.startOffset
        const lastAt = text.lastIndexOf('@', caretPos - 1)

        if (lastAt !== -1) {
          range.setStart(textNode, lastAt)
          range.setEnd(textNode, caretPos)
          range.deleteContents()
        }
      }

      const chip = createUserChip(user.id, user.handle)
      range.insertNode(chip)

      const space = document.createTextNode('\u00A0')
      range.setStartAfter(chip)
      range.insertNode(space)

      range.setStartAfter(space)
      range.setEndAfter(space)
      selection.removeAllRanges()
      selection.addRange(range)

      onMentionClose()
      isTypingMention.current = false
      serializeContent()
      containerRef.current.focus()
    }

    const insertTag = (tag: TagUsage) => {
      if (!containerRef.current) return

      const selection = window.getSelection()
      if (!selection) return
      const range = selection.getRangeAt(0)

      const textNode = range.startContainer
      if (textNode.nodeType === Node.TEXT_NODE) {
        const text = textNode.textContent || ''
        const caretPos = range.startOffset
        const lastHash = text.lastIndexOf('#', caretPos - 1)

        if (lastHash !== -1) {
          range.setStart(textNode, lastHash)
          range.setEnd(textNode, caretPos)
          range.deleteContents()
        }
      }

      const chip = createTagChip(tag.id, tag.name)
      range.insertNode(chip)

      const space = document.createTextNode('\u00A0')
      range.setStartAfter(chip)
      range.insertNode(space)

      range.setStartAfter(space)
      range.setEndAfter(space)
      selection.removeAllRanges()
      selection.addRange(range)

      onTagClose?.()
      isTypingTag.current = false
      serializeContent()
      containerRef.current.focus()
    }

    React.useImperativeHandle(ref, () => ({
      insertMention,
      insertUserMention,
      insertTag,
      focus: () => containerRef.current?.focus(),
    }))

    return (
      <div
        ref={containerRef}
        contentEditable
        onInput={handleInput}
        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all min-h-[200px] whitespace-pre-wrap overflow-y-auto max-h-[420px] empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 dark:empty:before:text-gray-500"
        data-placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (isTypingMention.current || isTypingTag.current)) {
            e.preventDefault()
          }
        }}
      />
    )
  }
)
