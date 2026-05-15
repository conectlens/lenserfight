import React, { useId } from 'react'

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  position?: TooltipPosition
  delayMs?: number
  className?: string
  contentClassName?: string
}

const positionClasses: Record<
  TooltipPosition,
  { container: string; arrow: string }
> = {
  top: {
    container:
      'bottom-full left-1/2 mb-2.5 -translate-x-1/2',
    arrow:
      'left-1/2 top-full -translate-x-1/2 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-white dark:border-t-greyscale-900',
  },
  bottom: {
    container:
      'top-full left-1/2 mt-2.5 -translate-x-1/2',
    arrow:
      'left-1/2 bottom-full -translate-x-1/2 border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent border-b-white dark:border-b-greyscale-900',
  },
  left: {
    container:
      'right-full top-1/2 mr-2.5 -translate-y-1/2',
    arrow:
      'left-full top-1/2 -translate-y-1/2 border-t-[5px] border-b-[5px] border-l-[5px] border-t-transparent border-b-transparent border-l-white dark:border-l-greyscale-900',
  },
  right: {
    container:
      'left-full top-1/2 ml-2.5 -translate-y-1/2',
    arrow:
      'right-full top-1/2 -translate-y-1/2 border-t-[5px] border-b-[5px] border-r-[5px] border-t-transparent border-b-transparent border-r-white dark:border-r-greyscale-900',
  },
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delayMs = 300,
  className = '',
  contentClassName = 'whitespace-nowrap',
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
        className={`pointer-events-none absolute z-50 w-max rounded-lg px-3 py-2 text-xs font-medium text-greyscale-800 bg-white border border-surface-border shadow-lg dark:text-greyscale-100 dark:bg-greyscale-900 opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${pos.container} ${contentClassName}`}
      >
        {content}
        <span className={`absolute h-0 w-0 ${pos.arrow}`} />
      </span>
    </span>
  )
}
