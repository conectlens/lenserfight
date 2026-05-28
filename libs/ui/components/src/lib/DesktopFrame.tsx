import React from 'react'
import { Badge } from './Badge'

export interface DesktopFrameProps {
  title: string
  url?: string
  label?: string
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}

export const DesktopFrame: React.FC<DesktopFrameProps> = ({
  title,
  url = 'lenserfight.com',
  label = 'Desktop preview',
  children,
  className = '',
  bodyClassName = '',
}) => {
  return (
    <section
      className={`overflow-hidden rounded-[28px] border border-greyscale-200 bg-greyscale-0 shadow-[0_24px_80px_rgba(0,0,0,0.12)] dark:border-greyscale-800 dark:bg-greyscale-900 ${className}`}
      aria-label={title}
    >
      <div className="flex flex-col gap-3 border-b border-greyscale-200 bg-greyscale-25 px-4 py-3 dark:border-greyscale-800 dark:bg-primary-dark-600 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-status-red/80" />
          <span className="h-3 w-3 rounded-full bg-primary-yellow-500/90" />
          <span className="h-3 w-3 rounded-full bg-status-green/80" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
              {title}
            </p>
            <Badge color="gray" variant="outline" size="sm">
              {label}
            </Badge>
          </div>
          <p className="truncate text-xs text-greyscale-500 dark:text-greyscale-400">{url}</p>
        </div>
      </div>

      <div className={`bg-surface-base p-4 sm:p-6 ${bodyClassName}`}>{children}</div>
    </section>
  )
}
