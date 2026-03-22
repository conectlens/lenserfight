import React from 'react'
import { toast } from 'sonner'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'dark' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  /** When set, visually disables the button but keeps it clickable — shows this message as an error toast on click. */
  contextError?: string | null
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-primary text-gray-900 hover:bg-primary-yellow-400 focus:ring-primary/50 shadow-sm border border-transparent',
  secondary:
    'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 dark:focus:ring-gray-600',
  dark: 'bg-deep-lens-navy-500 border border-transparent text-white hover:bg-deep-lens-navy-600 focus:ring-deep-lens-navy-500/50 shadow-sm',
  ghost:
    'bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200',
  danger:
    'bg-red-500 border border-transparent text-white hover:bg-red-600 focus:ring-red-500/50 shadow-sm',
}

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'py-2.5 px-4 text-base',
  lg: 'px-6 py-3 text-lg',
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
      onClick,
      ...props
    },
    ref
  ) => {
    const baseStyle =
      'w-full rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed dark:focus:ring-offset-gray-900'

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
        className={`${baseStyle} ${sizeClasses[size]} ${variantClasses[variant]} ${contextError ? 'opacity-50 cursor-not-allowed' : ''} ${className} flex justify-center items-center`}
        disabled={disabled || isLoading}
        aria-disabled={!!contextError || disabled || isLoading}
        onClick={handleClick}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
