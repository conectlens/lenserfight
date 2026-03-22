import React, { useId } from 'react'

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  position?: TooltipPosition
  delayMs?: number
  className?: string
}

const positionClasses: Record<
  TooltipPosition,
  { container: string; arrow: string }
> = {
  top: {
    container:
      'bottom-full left-1/2 mb-2 -translate-x-1/2',
    arrow:
      'left-1/2 top-full -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-greyscale-900 dark:border-t-greyscale-100',
  },
  bottom: {
    container:
      'top-full left-1/2 mt-2 -translate-x-1/2',
    arrow:
      'left-1/2 bottom-full -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-greyscale-900 dark:border-b-greyscale-100',
  },
  left: {
    container:
      'right-full top-1/2 mr-2 -translate-y-1/2',
    arrow:
      'left-full top-1/2 -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-greyscale-900 dark:border-l-greyscale-100',
  },
  right: {
    container:
      'left-full top-1/2 ml-2 -translate-y-1/2',
    arrow:
      'right-full top-1/2 -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-greyscale-900 dark:border-r-greyscale-100',
  },
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delayMs = 300,
  className = '',
}: TooltipProps) {
  const id = useId()
  const pos = positionClasses[position]

  return (
    <span className={`group relative inline-flex ${className}`}>
      <span aria-describedby={id}>{children}</span>
      <span
        id={id}
        role="tooltip"
        style={{ transitionDelay: `${delayMs}ms` }}
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium text-greyscale-0 dark:text-greyscale-900 bg-greyscale-900 dark:bg-greyscale-100 shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${pos.container}`}
      >
        {content}
        <span className={`absolute h-0 w-0 ${pos.arrow}`} />
      </span>
    </span>
  )
}
