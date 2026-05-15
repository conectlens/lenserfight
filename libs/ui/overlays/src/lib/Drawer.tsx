import React, { useEffect, useRef, useState } from 'react'
import { Portal } from './Portal'
import { Backdrop } from './Backdrop'

export interface DrawerProps {
  open: boolean
  onClose?: () => void
  title?: string
  /**
   * Which edge the drawer slides in from.
   * @default 'right'
   */
  side?: 'left' | 'right' | 'top' | 'bottom'
  /**
   * Tailwind width class applied to left/right drawers.
   * @default 'w-80'
   */
  width?: string
  /**
   * Tailwind height class applied to top/bottom drawers.
   * @default 'h-80'
   */
  height?: string
  children: React.ReactNode
  footer?: React.ReactNode
  dismissOnBackdrop?: boolean
  className?: string
}

const position: Record<NonNullable<DrawerProps['side']>, string> = {
  left:   'left-0 top-0 h-full',
  right:  'right-0 top-0 h-full',
  top:    'top-0 left-0 w-full',
  bottom: 'bottom-0 left-0 w-full',
}

const roundedSide: Record<NonNullable<DrawerProps['side']>, string> = {
  left:   'rounded-r-2xl',
  right:  'rounded-l-2xl',
  top:    'rounded-b-2xl',
  bottom: 'rounded-t-2xl',
}

const borderSide: Record<NonNullable<DrawerProps['side']>, string> = {
  left:   'border-r',
  right:  'border-l',
  top:    'border-b',
  bottom: 'border-t',
}

const slideIn: Record<NonNullable<DrawerProps['side']>, string> = {
  left:   'translate-x-0',
  right:  'translate-x-0',
  top:    'translate-y-0',
  bottom: 'translate-y-0',
}

const slideOut: Record<NonNullable<DrawerProps['side']>, string> = {
  left:   '-translate-x-full',
  right:  'translate-x-full',
  top:    '-translate-y-full',
  bottom: 'translate-y-full',
}

/**
 * Side panel drawer. Slides in from left, right, top, or bottom.
 *
 * @example
 * <Drawer open={isOpen} onClose={close} title="Filters" side="right">
 *   <FilterPanel />
 * </Drawer>
 *
 * @example
 * <Drawer open={isOpen} onClose={close} side="bottom" height="h-96">
 *   <BottomMenu />
 * </Drawer>
 */
export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  side = 'right',
  width = 'w-80',
  height = 'h-80',
  children,
  footer,
  dismissOnBackdrop = true,
  className = '',
}) => {
  const panelRef = useRef<HTMLDivElement>(null)
  // `mounted` stays true until the exit animation completes
  const [mounted, setMounted] = useState(open)

  useEffect(() => {
    if (open) setMounted(true)
  }, [open])

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

  if (!mounted) return null

  const isVertical = side === 'top' || side === 'bottom'
  const sizeClass = isVertical ? height : width

  return (
    <Portal>
      <div className="fixed inset-0 z-[9000]" role="dialog" aria-modal="true">
        <Backdrop visible={open} onDismiss={dismissOnBackdrop ? onClose : undefined} blur />

        <div
          ref={panelRef}
          tabIndex={-1}
          onTransitionEnd={() => { if (!open) setMounted(false) }}
          className={`
            fixed ${position[side]} ${sizeClass}
            bg-surface-raised shadow-neu-4
            border-surface-border ${borderSide[side]}
            ${roundedSide[side]}
            flex flex-col
            z-[9001]
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

          <div className="flex-1 overflow-y-auto overscroll-contain p-5">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-5 pb-5 flex-shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </Portal>
  )
}

Drawer.displayName = 'Drawer'
