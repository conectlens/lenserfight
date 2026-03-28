import React from 'react'

// ── Linear Progress ────────────────────────────────────────────────────────

export type ProgressColor = 'primary' | 'status-green' | 'status-red' | 'status-blue'

export interface LinearProgressProps {
  value: number // 0–100
  label?: string
  showLabel?: boolean
  color?: ProgressColor
  className?: string
}

const colorClasses: Record<ProgressColor, string> = {
  primary: 'bg-primary-yellow-500',
  'status-green': 'bg-status-green',
  'status-red': 'bg-status-red',
  'status-blue': 'bg-primary-yellow-500',
}

export const LinearProgress = React.forwardRef<HTMLDivElement, LinearProgressProps>(
  ({ value, label, showLabel = false, color = 'primary', className = '' }, ref) => {
    const clamped = Math.min(100, Math.max(0, value))

    return (
      <div ref={ref} className={`w-full ${className}`}>
        {(label || showLabel) && (
          <div className="mb-1.5 flex items-center justify-between">
            {label && (
              <span className="text-sm font-medium text-greyscale-700 dark:text-greyscale-300">
                {label}
              </span>
            )}
            {showLabel && (
              <span className="text-sm text-greyscale-500 dark:text-greyscale-400">
                {clamped}%
              </span>
            )}
          </div>
        )}
        <div
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
          className="h-2 w-full overflow-hidden rounded-full bg-greyscale-200 dark:bg-primary-dark-500"
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${colorClasses[color]}`}
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>
    )
  }
)

LinearProgress.displayName = 'LinearProgress'

// ── Circular Progress ──────────────────────────────────────────────────────

export interface CircularProgressProps {
  value?: number // undefined = indeterminate spinner
  size?: number // px, default 48
  strokeWidth?: number // default 4
  color?: ProgressColor
  showLabel?: boolean
  className?: string
}

export function CircularProgress({
  value,
  size = 48,
  strokeWidth = 4,
  color = 'primary',
  showLabel = false,
  className = '',
}: CircularProgressProps) {
  const isIndeterminate = value === undefined
  const clamped = isIndeterminate ? 0 : Math.min(100, Math.max(0, value))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  const strokeColorClass: Record<ProgressColor, string> = {
    primary: 'stroke-primary-yellow-500',
    'status-green': 'stroke-status-green',
    'status-red': 'stroke-status-red',
    'status-blue': 'stroke-primary-yellow-500',
  }

  return (
    <span
      role="progressbar"
      aria-valuenow={isIndeterminate ? undefined : clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`relative inline-flex items-center justify-center ${isIndeterminate ? 'animate-spin' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-greyscale-200 dark:stroke-primary-dark-500"
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={isIndeterminate ? circumference * 0.75 : offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={`transition-[stroke-dashoffset] duration-500 ease-out ${strokeColorClass[color]}`}
        />
      </svg>
      {showLabel && !isIndeterminate && (
        <span className="absolute text-xs font-semibold text-greyscale-700 dark:text-greyscale-300">
          {clamped}%
        </span>
      )}
    </span>
  )
}
