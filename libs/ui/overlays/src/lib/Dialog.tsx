import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Portal } from './Portal'
import { Backdrop } from './Backdrop'
import { DialogHeaderContext, type DialogHeaderSlot } from './DialogHeaderContext'

export interface DialogProps {
  open: boolean
  onClose?: () => void
  /** Modal title — truncated at 60 chars */
  title?: string
  /** Modal subtitle — clamped to 2 lines, shown below title */
  description?: string
  /** Optional icon rendered left of the title+description block */
  icon?: React.ReactNode
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
const TITLE_MAX = 60
const DESC_MAX = 120

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  maxWidth = 'max-w-md',
  dismissOnBackdrop = true,
  panelClassName = '',
}) => {
  // Children (e.g. StepWizard) can override the header slot via context
  const [headerSlot, setHeaderSlot] = useState<DialogHeaderSlot | null>(null)

  const setHeader = useCallback((slot: DialogHeaderSlot) => setHeaderSlot(slot), [])
  const clearHeader = useCallback(() => setHeaderSlot(null), [])

  // Merge: slot overrides props when present
  const activeTitle = headerSlot?.title ?? title
  const activeDesc = headerSlot?.description ?? description
  const activeIcon = headerSlot?.icon ?? icon

  const safeTitle = activeTitle ? activeTitle.slice(0, TITLE_MAX) : undefined
  const safeDesc = activeDesc ? activeDesc.slice(0, DESC_MAX) : undefined
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
    <DialogHeaderContext.Provider value={{ setHeader, clearHeader }}>
      <Portal>
        <div
          className="fixed inset-0 z-modal flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={safeTitle ? 'dialog-title' : undefined}
          aria-describedby={safeDesc ? 'dialog-desc' : undefined}
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
            {(safeTitle || safeDesc || activeIcon || onClose) && (
              <div className="flex items-center gap-3 px-6 py-4 border-b border-surface-border flex-shrink-0">
                {/* Icon badge */}
                {activeIcon && (
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-status-blue/10 text-status-blue">
                    {activeIcon}
                  </div>
                )}

                {/* Title + description block */}
                {(safeTitle || safeDesc) && (
                  <div className="min-w-0 flex-1">
                    {safeTitle && (
                      <h2
                        id="dialog-title"
                        className="text-base font-semibold leading-snug text-greyscale-900 dark:text-greyscale-50 truncate"
                      >
                        {safeTitle}
                      </h2>
                    )}
                    {safeDesc && (
                      <p
                        id="dialog-desc"
                        className="mt-0.5 text-xs leading-relaxed text-greyscale-500 dark:text-greyscale-400 line-clamp-2"
                      >
                        {safeDesc}
                      </p>
                    )}
                  </div>
                )}

                {/* Close button — far right */}
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="ml-auto flex-shrink-0 rounded-lg p-1.5 text-greyscale-400 hover:text-greyscale-600 hover:bg-greyscale-100 dark:hover:bg-greyscale-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500/50"
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
              {children}
            </div>
          </div>
        </div>
      </Portal>
    </DialogHeaderContext.Provider>
  )
}

Dialog.displayName = 'Dialog'
