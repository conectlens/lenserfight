import React from 'react'
import { Pressable } from './Pressable'

export interface ChipProps {
  label: string
  variant?: 'filled' | 'outline'
  size?: 'sm' | 'md'
  /** When provided, renders a remove (×) button */
  onRemove?: () => void
  /** When provided, makes the chip itself clickable */
  onClick?: () => void
  disabled?: boolean
  className?: string
}

const variantClasses = {
  filled:  'bg-greyscale-100 dark:bg-greyscale-800 border-transparent',
  outline: 'bg-transparent border-greyscale-300 dark:border-greyscale-600',
}

const sizeClasses = {
  sm: 'h-6 text-xs px-2 gap-1',
  md: 'h-7 text-sm px-2.5 gap-1.5',
}

/**
 * Small, inline label — optionally removable or clickable.
 * Used for tags, filters, and selection indicators.
 *
 * @example
 * <Chip label="TypeScript" onRemove={() => removeTag('ts')} />
 * <Chip label="Active" variant="outline" />
 */
export const Chip: React.FC<ChipProps> = ({
  label,
  variant = 'filled',
  size = 'md',
  onRemove,
  onClick,
  disabled = false,
  className = '',
}) => {
  const base = `
    inline-flex items-center rounded-full border font-medium
    text-greyscale-700 dark:text-greyscale-200
    transition-colors duration-fast ease-standard
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${className}
  `

  if (onClick) {
    return (
      <Pressable
        onPress={onClick}
        disabled={disabled}
        className={`${base} hover:bg-greyscale-200 dark:hover:bg-greyscale-700`}
      >
        {label}
        {onRemove && (
          <RemoveButton onRemove={onRemove} disabled={disabled} />
        )}
      </Pressable>
    )
  }

  return (
    <span className={`${base} ${disabled ? 'opacity-40' : ''}`}>
      {label}
      {onRemove && (
        <RemoveButton onRemove={onRemove} disabled={disabled} />
      )}
    </span>
  )
}

function RemoveButton({ onRemove, disabled }: { onRemove: () => void; disabled: boolean }) {
  return (
    <Pressable
      onPress={onRemove}
      disabled={disabled}
      aria-label="Remove"
      className="ml-0.5 -mr-1 rounded-full p-0.5 hover:bg-greyscale-300 dark:hover:bg-greyscale-600"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 12 12"
        fill="currentColor"
        className="h-3 w-3 text-greyscale-500"
      >
        <path d="M10.293 1.293a1 1 0 0 1 1.414 1.414L7.414 6l4.293 4.293a1 1 0 0 1-1.414 1.414L6 7.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L4.586 6 .293 1.707A1 1 0 0 1 1.707.293L6 4.586 10.293.293a1 1 0 0 1 1 1z" />
      </svg>
    </Pressable>
  )
}

Chip.displayName = 'Chip'
