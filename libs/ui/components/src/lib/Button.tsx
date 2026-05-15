import React from 'react'
import { toast } from 'sonner'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'dark' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  /** When set, visually disables the button but keeps it clickable — shows this message as an error toast on click. */
  contextError?: string | null
  /** When true, button stretches to full width of its container. */
  fullWidth?: boolean
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-primary text-greyscale-900 border border-transparent hover:bg-primary-yellow-400 active:bg-primary-yellow-500 focus-visible:ring-primary-yellow-400/60 shadow-sm',
  secondary:
    'bg-white border border-greyscale-200 text-greyscale-800 hover:bg-greyscale-50 hover:border-greyscale-300 active:bg-greyscale-100 focus-visible:ring-greyscale-300/60 dark:bg-greyscale-800 dark:border-greyscale-700 dark:text-greyscale-100 dark:hover:bg-greyscale-700 dark:hover:border-greyscale-600 dark:active:bg-greyscale-600 dark:focus-visible:ring-greyscale-600/60',
  dark:
    'bg-primary-dark-500 border border-transparent text-white hover:bg-primary-dark-400 active:bg-primary-dark-300 focus-visible:ring-primary-dark-500/60 shadow-sm dark:bg-primary-dark-500 dark:hover:bg-primary-dark-400',
  ghost:
    'bg-transparent border border-transparent text-greyscale-600 hover:bg-greyscale-100 hover:border-greyscale-200 hover:text-greyscale-900 active:bg-greyscale-200 focus-visible:ring-greyscale-300/60 dark:text-greyscale-400 dark:hover:bg-greyscale-800 dark:hover:border-greyscale-700 dark:hover:text-greyscale-100 dark:active:bg-greyscale-700',
  danger:
    'bg-status-red border border-transparent text-white hover:brightness-110 active:brightness-90 focus-visible:ring-status-red/40 shadow-sm',
  outline:
    'bg-transparent border border-greyscale-300 text-greyscale-800 hover:bg-greyscale-50 active:bg-greyscale-100 focus-visible:ring-greyscale-300/60 dark:border-greyscale-600 dark:text-greyscale-100 dark:hover:bg-greyscale-800',
}

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-2.5 py-1 text-xs font-semibold rounded-xl',
  md: 'px-4 py-2 text-sm font-semibold rounded-2xl',
  lg: 'px-6 py-3 text-base font-semibold rounded-2xl',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading,
      className = '',
      disabled,
      contextError,
      fullWidth = false,
      onClick,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (contextError) {
        toast.error(contextError)
        return
      }
      onClick?.(e)
    }

    return (
      <button
        ref={ref}
        className={[
          'inline-flex items-center justify-center gap-1.5',
          'transition-all duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-greyscale-900',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          fullWidth ? 'w-full' : '',
          contextError ? 'opacity-50 cursor-not-allowed' : '',
          sizeClasses[size],
          variantClasses[variant],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        disabled={disabled || isLoading}
        aria-disabled={!!contextError || disabled || isLoading}
        onClick={handleClick}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin h-3.5 w-3.5 shrink-0 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
