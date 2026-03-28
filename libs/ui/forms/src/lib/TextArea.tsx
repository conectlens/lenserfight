import React, { useEffect, useRef } from 'react'

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
  /** Auto-resize to fit content (defaults to true) */
  autoResize?: boolean
  minRows?: number
  maxRows?: number
  /** Called when Ctrl+Enter (or Cmd+Enter on Mac) is pressed */
  onCtrlEnter?: () => void
}

/**
 * Multi-line text input with optional auto-resize and neumorphic inset focus state.
 *
 * @example
 * <TextArea placeholder="Describe your lens…" autoResize minRows={3} />
 */
export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    { error, autoResize = true, minRows = 3, maxRows, className = '', disabled, onChange, onKeyDown, onCtrlEnter, ...props },
    forwardedRef
  ) => {
    const innerRef = useRef<HTMLTextAreaElement>(null)
    const ref = (forwardedRef as React.RefObject<HTMLTextAreaElement>) ?? innerRef

    const resize = () => {
      const el = ref.current
      if (!el || !autoResize) return
      el.style.height = 'auto'
      const lineHeight = parseInt(getComputedStyle(el).lineHeight) || 20
      const min = lineHeight * minRows + 16 // + padding
      const max = maxRows ? lineHeight * maxRows + 16 : Infinity
      el.style.height = `${Math.min(Math.max(el.scrollHeight, min), max)}px`
    }

    useEffect(() => {
      resize()
    })

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      resize()
      onChange?.(e)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        onCtrlEnter?.()
      }
      onKeyDown?.(e)
    }

    const baseClasses = `
      w-full rounded-xl border bg-surface-raised px-3.5 py-2.5
      text-sm text-greyscale-900 placeholder:text-greyscale-400
      dark:text-greyscale-50 dark:placeholder:text-greyscale-600
      outline-none resize-none
      transition-all duration-normal ease-standard
      shadow-neu-1 focus:shadow-neu-inset-1
    `

    const stateClasses = error
      ? 'border-status-red focus:ring-2 focus:ring-status-red/30'
      : 'border-surface-border focus:border-deep-lens-navy-400 focus:ring-2 focus:ring-deep-lens-navy-400/20 dark:focus:border-primary-yellow-500 dark:focus:ring-primary-yellow-500/20'

    const disabledClasses = disabled ? 'cursor-not-allowed opacity-50 shadow-none' : ''

    return (
      <textarea
        ref={ref}
        disabled={disabled}
        rows={minRows}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={`${baseClasses} ${stateClasses} ${disabledClasses} ${className}`}
        {...props}
      />
    )
  }
)

TextArea.displayName = 'TextArea'
