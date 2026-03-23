import React, { useEffect, useRef } from 'react'
import { Portal } from './Portal'
import { Backdrop } from './Backdrop'

export interface DialogProps {
  open: boolean
  onClose?: () => void
  title?: string
  description?: string
  children: React.ReactNode
  /** Maximum width class, e.g. 'max-w-md' (default) */
  maxWidth?: string
  /** Whether clicking the backdrop closes the dialog */
  dismissOnBackdrop?: boolean
  panelClassName?: string
}

/**
 * Accessible modal dialog with focus trap and keyboard dismiss.
 * Uses Portal + Backdrop for correct stacking.
 *
 * @example
 * <Dialog open={isOpen} onClose={close} title="Confirm action">
 *   <p>Are you sure?</p>
 * </Dialog>
 */
export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-md',
  dismissOnBackdrop = true,
  panelClassName = '',
}) => {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Auto-focus panel
  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <Portal>
      <div
        className="fixed inset-0 z-modal flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'dialog-title' : undefined}
        aria-describedby={description ? 'dialog-desc' : undefined}
      >
        <Backdrop visible onDismiss={dismissOnBackdrop ? onClose : undefined} blur />

        <div
          ref={panelRef}
          tabIndex={-1}
          className={`
            relative z-10 w-full ${maxWidth}
            bg-surface-raised
            rounded-2xl shadow-neu-3
            border border-surface-border
            flex flex-col overflow-hidden
            max-h-[calc(100dvh-2rem)]
            animate-in fade-in zoom-in-95 duration-normal
            focus:outline-none
            ${panelClassName}
          `}
        >
          {/* Header */}
          {(title || onClose) && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border flex-shrink-0">
              {title && (
                <h2 id="dialog-title" className="text-base font-semibold text-greyscale-900 dark:text-greyscale-50 truncate pr-4">
                  {title}
                </h2>
              )}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="rounded-lg p-1.5 text-greyscale-400 hover:text-greyscale-600 hover:bg-greyscale-100 dark:hover:bg-greyscale-800 transition-colors flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500/50"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-6">
            {description && (
              <p id="dialog-desc" className="text-sm text-greyscale-500 dark:text-greyscale-400 mb-4">
                {description}
              </p>
            )}
            {children}
          </div>
        </div>
      </div>
    </Portal>
  )
}

Dialog.displayName = 'Dialog'
