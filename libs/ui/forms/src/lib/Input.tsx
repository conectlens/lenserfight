import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Shows error state styling */
  error?: boolean
  /** Leading icon/adornment */
  startAdornment?: React.ReactNode
  /** Trailing icon/adornment */
  endAdornment?: React.ReactNode
  /** Called when Ctrl+Enter (or Cmd+Enter on Mac) is pressed */
  onCtrlEnter?: () => void
}

/**
 * Base text input with neumorphic inset styling on focus.
 * Compose with Field/FieldLabel/FieldError for full form field layout.
 *
 * @example
 * <Input placeholder="Enter username" error={!!errors.username} />
 * <Input startAdornment={<SearchIcon />} placeholder="Search…" />
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, startAdornment, endAdornment, className = '', disabled, onCtrlEnter, onKeyDown, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
      outline-none
      transition-all duration-normal ease-standard
      shadow-neu-1
      focus:shadow-neu-inset-1
    `

    const stateClasses = error
      ? 'border-status-red focus:ring-2 focus:ring-status-red/30'
      : 'border-surface-border focus:border-deep-lens-navy-400 focus:ring-2 focus:ring-deep-lens-navy-400/20 dark:focus:border-primary-yellow-500 dark:focus:ring-primary-yellow-500/20'

    const disabledClasses = disabled
      ? 'cursor-not-allowed opacity-50 shadow-none'
      : ''

    const paddingClasses = [
      startAdornment ? 'pl-10' : '',
      endAdornment ? 'pr-10' : '',
    ].join(' ')

    if (startAdornment || endAdornment) {
      return (
        <div className="relative">
          {startAdornment && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-greyscale-400">
              {startAdornment}
            </span>
          )}
          <input
            ref={ref}
            disabled={disabled}
            onKeyDown={handleKeyDown}
            className={`${baseClasses} ${stateClasses} ${disabledClasses} ${paddingClasses} ${className}`}
            {...props}
          />
          {endAdornment && (
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-greyscale-400">
              {endAdornment}
            </span>
          )}
        </div>
      )
    }

    return (
      <input
        ref={ref}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        className={`${baseClasses} ${stateClasses} ${disabledClasses} ${className}`}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
