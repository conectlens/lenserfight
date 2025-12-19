import React, { useRef, useEffect } from 'react'

import { mentionService } from '../services/mentionService'
import { PromptTemplateViewModel } from '../types/prompts.types'

interface RichMentionInputProps {
  value: string // The tokenized value from parent
  onChange: (value: string) => void
  onMentionSearch: (query: string, coords: { top: number; left: number }) => void
  onMentionClose: () => void
  placeholder?: string
}

export interface RichMentionInputHandle {
  insertMention: (prompt: PromptTemplateViewModel) => void
  focus: () => void
}

export const RichMentionInput = React.forwardRef<RichMentionInputHandle, RichMentionInputProps>(
  ({ value, onChange, onMentionSearch, onMentionClose, placeholder }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const isTypingMention = useRef(false)
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
      // We check textContent to see if visual DOM is empty.
      const isContainerEmpty = !containerRef.current.textContent?.trim()

      // If container is empty but value is set, we need to hydrate.
      // We also check if value differs from lastKnownValue to avoid re-hydrating during typing loops
      // (though isContainerEmpty usually protects against that unless user typed spaces only).
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
          } else if (segment.type === 'mention' && segment.id) {
            const chip = document.createElement('span')
            chip.contentEditable = 'false'
            chip.className =
              'inline-flex items-center px-1.5 py-0.5 rounded mx-1 bg-primary/20 text-primary-900 font-medium text-sm select-none align-middle'
            chip.setAttribute('data-mention-id', segment.id)
            chip.textContent = segment.content || 'Unknown Prompt'
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

    const handleInput = () => {
      if (!containerRef.current) return

      // Check for @ trigger
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const textNode = range.startContainer

        // We only support mentions in text nodes for simplicity
        if (textNode.nodeType === Node.TEXT_NODE) {
          const text = textNode.textContent || ''
          const caretPos = range.startOffset

          // Find last @ before caret
          const lastAt = text.lastIndexOf('@', caretPos - 1)

          if (lastAt !== -1) {
            // Check if valid mention start (start of line or preceded by space)
            const isStart = lastAt === 0
            const isPrecededBySpace = !isStart && /[\s\u00A0]/.test(text[lastAt - 1])

            if (isStart || isPrecededBySpace) {
              const query = text.substring(lastAt + 1, caretPos)
              // No spaces allowed in search query to prevent menu getting stuck
              if (!/\s/.test(query)) {
                const coords = getCaretCoordinates()
                onMentionSearch(query, {
                  top: coords.top + (coords.height || 20),
                  left: coords.left,
                })
                isTypingMention.current = true
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
        }
      }

      serializeContent()
    }

    // Convert HTML back to tokenized string
    const serializeContent = () => {
      if (!containerRef.current) return

      let text = ''

      // Helper to walk nodes
      const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          text += node.textContent
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement
          if (el.hasAttribute('data-mention-id')) {
            const id = el.getAttribute('data-mention-id')
            text += `@[Prompt:${id}]`
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

      // Clean up excessive initial newlines if any
      const cleanText = text.replace(/^\n+/, '')

      if (lastKnownValue.current !== cleanText) {
        lastKnownValue.current = cleanText
        onChange(cleanText)
      }
    }

    const insertMention = (prompt: PromptTemplateViewModel) => {
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

      const chip = document.createElement('span')
      chip.contentEditable = 'false'
      chip.className =
        'inline-flex items-center px-1.5 py-0.5 rounded mx-1 bg-primary/20 text-primary-900 font-medium text-sm select-none align-middle'
      chip.setAttribute('data-mention-id', prompt.id)
      chip.textContent = prompt.title

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

    React.useImperativeHandle(ref, () => ({
      insertMention,
      focus: () => containerRef.current?.focus(),
    }))

    return (
      <div
        ref={containerRef}
        contentEditable
        onInput={handleInput}
        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all min-h-[140px] whitespace-pre-wrap overflow-y-auto max-h-[300px]"
        data-placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && isTypingMention.current) {
            e.preventDefault()
          }
        }}
      />
    )
  }
)
