import React, { useEffect, useRef } from 'react'
import { Portal } from './Portal'
import { Backdrop } from './Backdrop'

export interface DrawerProps {
  open: boolean
  onClose?: () => void
  title?: string
  side?: 'left' | 'right'
  width?: string
  children: React.ReactNode
  dismissOnBackdrop?: boolean
  className?: string
}

const slideIn = {
  left:  'translate-x-0',
  right: 'translate-x-0',
}

const slideOut = {
  left:  '-translate-x-full',
  right: 'translate-x-full',
}

const position = {
  left:  'left-0 top-0 h-full',
  right: 'right-0 top-0 h-full',
}

const roundedSide = {
  left:  'rounded-r-2xl',
  right: 'rounded-l-2xl',
}

/**
 * Side panel drawer. Slides in from left or right.
 *
 * @example
 * <Drawer open={isOpen} onClose={close} title="Filters" side="right">
 *   <FilterPanel />
 * </Drawer>
 */
export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  side = 'right',
  width = 'w-80',
  children,
  dismissOnBackdrop = true,
  className = '',
}) => {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-modal" role="dialog" aria-modal="true">
        <Backdrop visible onDismiss={dismissOnBackdrop ? onClose : undefined} />

        <div
          ref={panelRef}
          tabIndex={-1}
          className={`
            fixed ${position[side]} ${width}
            bg-surface-raised shadow-neu-4
            border-surface-border
            ${side === 'right' ? 'border-l' : 'border-r'}
            ${roundedSide[side]}
            flex flex-col
            transform transition-transform duration-slow ease-standard
            ${open ? slideIn[side] : slideOut[side]}
            focus:outline-none
            ${className}
          `}
        >
          {/* Header */}
          {(title || onClose) && (
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border flex-shrink-0">
              {title && (
                <h2 className="text-base font-semibold text-greyscale-900 dark:text-greyscale-50">
                  {title}
                </h2>
              )}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close drawer"
                  className="rounded-lg p-1.5 text-greyscale-400 hover:text-greyscale-600 hover:bg-greyscale-100 dark:hover:bg-greyscale-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500/50"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-5">
            {children}
          </div>
        </div>
      </div>
    </Portal>
  )
}

Drawer.displayName = 'Drawer'
