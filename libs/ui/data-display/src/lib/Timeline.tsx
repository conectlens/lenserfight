import React from 'react'

export interface TimelineItem {
  id: string | number
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  timestamp?: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error'
}

export interface TimelineProps {
  items: TimelineItem[]
  className?: string
}

const variantDotColor: Record<NonNullable<TimelineItem['variant']>, string> = {
  default: 'bg-greyscale-300 dark:bg-greyscale-600',
  success: 'bg-status-green',
  warning: 'bg-primary-yellow-500',
  error:   'bg-status-red',
}

/**
 * Vertical timeline of events.
 *
 * @example
 * <Timeline items={[
 *   { id: 1, title: 'Created account', timestamp: '2 days ago', variant: 'success' },
 *   { id: 2, title: 'First lens published', timestamp: '1 day ago' },
 * ]} />
 */
export const Timeline: React.FC<TimelineProps> = ({ items, className = '' }) => {
  return (
    <ol className={`relative ${className}`}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        const dotColor = variantDotColor[item.variant ?? 'default']

        return (
          <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Connector line */}
            {!isLast && (
              <span
                className="absolute left-3 top-6 bottom-0 w-px bg-surface-border"
                aria-hidden="true"
              />
            )}

            {/* Dot / icon */}
            <span className="relative z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center">
              {item.icon ? (
                <span className="text-greyscale-400">{item.icon}</span>
              ) : (
                <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
              )}
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-greyscale-800 dark:text-greyscale-200">
                  {item.title}
                </p>
                {item.timestamp && (
                  <time className="flex-shrink-0 text-xs text-greyscale-400">
                    {item.timestamp}
                  </time>
                )}
              </div>
              {item.description && (
                <p className="mt-0.5 text-sm text-greyscale-500">{item.description}</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

Timeline.displayName = 'Timeline'
