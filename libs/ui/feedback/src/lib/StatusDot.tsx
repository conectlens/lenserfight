import React from 'react'

export type StatusDotVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'online' | 'offline'

export interface StatusDotProps {
  variant?: StatusDotVariant
  size?: 'xs' | 'sm' | 'md'
  /** Accessible label */
  label?: string
  pulse?: boolean
  className?: string
}

const colorClasses: Record<StatusDotVariant, string> = {
  success: 'bg-status-green',
  warning: 'bg-primary-yellow-500',
  error:   'bg-status-red',
  info:    'bg-primary-yellow-500',
  neutral: 'bg-greyscale-400',
  online:  'bg-status-green',
  offline: 'bg-greyscale-400',
}

const sizeClasses = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
}

/**
 * Small colored status indicator dot.
 *
 * @example
 * <StatusDot variant="online" label="Online" pulse />
 * <StatusDot variant="error" label="Error" size="sm" />
 */
export const StatusDot: React.FC<StatusDotProps> = ({
  variant = 'neutral',
  size = 'sm',
  label,
  pulse = false,
  className = '',
}) => {
  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      className={`relative inline-flex ${sizeClasses[size]} ${className}`}
    >
      {pulse && (
        <span
          className={`absolute inline-flex h-full w-full rounded-full ${colorClasses[variant]} opacity-75 animate-ping`}
        />
      )}
      <span className={`relative inline-flex rounded-full ${sizeClasses[size]} ${colorClasses[variant]}`} />
    </span>
  )
}

StatusDot.displayName = 'StatusDot'
