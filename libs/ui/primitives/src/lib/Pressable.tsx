import React from 'react'

export interface PressableProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Triggered on click/press (alias for onClick with web compatibility) */
  onPress?: (event: React.MouseEvent<HTMLButtonElement>) => void
  /** Whether this is a purely visual pressable (no semantic button role) */
  asChild?: boolean
}

/**
 * Platform-agnostic pressable primitive. On web it renders as a `<button>`.
 * Handles disabled state, focus ring, and cursor consistently.
 *
 * Prefer this over raw `<button>` elements to ensure consistent interaction styling.
 *
 * @example
 * <Pressable onPress={() => doSomething()}>
 *   <Icon name="heart" />
 * </Pressable>
 */
export const Pressable = React.forwardRef<HTMLButtonElement, PressableProps>(
  ({ onPress, onClick, disabled, className = '', children, type = 'button', ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onPress?.(e)
      onClick?.(e)
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        onClick={handleClick}
        className={`
          inline-flex items-center justify-center
          cursor-pointer
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500/50
          disabled:cursor-not-allowed disabled:opacity-40
          transition-opacity duration-fast ease-standard
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Pressable.displayName = 'Pressable'
