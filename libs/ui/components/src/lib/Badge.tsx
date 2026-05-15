import React from 'react'

export type BadgeColor = 'gray' | 'yellow' | 'green' | 'red' | 'blue' | 'purple'
export type BadgeVariant = 'solid' | 'outline'
export type BadgeSize = 'sm' | 'md'

export interface BadgeProps {
  color?: BadgeColor
  variant?: BadgeVariant
  size?: BadgeSize
  children: React.ReactNode
  className?: string
  title?: string
}

const solidClasses: Record<BadgeColor, string> = {
  gray: 'bg-greyscale-100 text-greyscale-700 dark:bg-greyscale-800 dark:text-greyscale-200',
  yellow: 'bg-primary-yellow-500/20 text-primary-yellow-800 dark:bg-primary-yellow-500/15 dark:text-primary-yellow-400',
  green: 'bg-status-green/15 text-status-green dark:bg-status-green/10',
  red: 'bg-status-red/15 text-status-red dark:bg-status-red/10',
  blue: 'bg-primary-yellow-500/15 text-primary-yellow-600 dark:bg-primary-yellow-500/10',
  purple: 'bg-status-purple/15 text-status-purple dark:bg-status-purple/10',
}

const outlineClasses: Record<BadgeColor, string> = {
  gray: 'border border-greyscale-300 text-greyscale-600 dark:border-greyscale-600 dark:text-greyscale-400',
  yellow: 'border border-primary-yellow-500/50 text-primary-yellow-700 dark:border-primary-yellow-500/40 dark:text-primary-yellow-400',
  green: 'border border-status-green/50 text-status-green',
  red: 'border border-status-red/50 text-status-red',
  blue: 'border border-primary-yellow-500/50 text-primary-yellow-600',
  purple: 'border border-status-purple/50 text-status-purple',
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs font-medium',
  md: 'px-2.5 py-1 text-sm font-medium',
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ color = 'gray', variant = 'solid', size = 'sm', children, className = '', title }, ref) => {
    const colorClass = variant === 'solid' ? solidClasses[color] : outlineClasses[color]

    return (
      <span
        ref={ref}
        title={title}
        className={`inline-flex items-center rounded-full ${sizeClasses[size]} ${colorClass} ${className}`}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'
