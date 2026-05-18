import React, { useEffect, useRef, useState, useCallback } from 'react'

import { Backdrop } from './Backdrop'
import { DialogFooterContext } from './DialogFooterContext'
import { DialogHeaderContext, type DialogHeaderSlot } from './DialogHeaderContext'
import { Portal } from './Portal'

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
  /** Optional class for the outermost fixed container (e.g. to override z-index) */
  containerClassName?: string
  /** Optional class applied to the Backdrop (e.g. to make it transparent) */
  backdropClassName?: string
  /** Sticky footer rendered outside the scrollable body. Pass <ModalFooter .../> here. */
  footer?: React.ReactNode
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
  containerClassName = '',
  backdropClassName = '',
  footer,
}) => {
  // Children (e.g. StepWizard) can override the header slot via context
  const [headerSlot, setHeaderSlot] = useState<DialogHeaderSlot | null>(null)
  const [footerSlot, setFooterSlot] = useState<React.ReactNode>(null)

  const setHeader = useCallback((slot: DialogHeaderSlot) => setHeaderSlot(slot), [])
  const clearHeader = useCallback(() => setHeaderSlot(null), [])
  const setFooter = useCallback((node: React.ReactNode) => setFooterSlot(node), [])
  const clearFooter = useCallback(() => setFooterSlot(null), [])

  // Merge: slot overrides props when present
  const activeTitle = headerSlot?.title ?? title
  const activeDesc = headerSlot?.description ?? description
  const activeIcon = headerSlot?.icon ?? icon
  const activeAction = headerSlot?.action

  const safeTitle = activeTitle ? activeTitle.slice(0, TITLE_MAX) : undefined
  const safeDesc = activeDesc ? activeDesc.slice(0, DESC_MAX) : undefined
  const panelRef = useRef<HTMLDivElement>(null)

  const submitActiveForm = useCallback(() => {
    const panel = panelRef.current
    if (!panel) return

    const activeElement = document.activeElement
    const activeForm =
      activeElement instanceof HTMLElement ? activeElement.closest('form') : null
    const form = activeForm ?? panel.querySelector('form')

    if (!(form instanceof HTMLFormElement)) return
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        submitActiveForm()
        return
      }
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose, submitActiveForm])

  // Auto-focus panel
  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <DialogHeaderContext.Provider value={{ setHeader, clearHeader }}>
    <DialogFooterContext.Provider value={{ setFooter, clearFooter }}>
      <Portal>
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${containerClassName}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={safeTitle ? 'dialog-title' : undefined}
          aria-describedby={safeDesc ? 'dialog-desc' : undefined}
        >
          <Backdrop visible onDismiss={dismissOnBackdrop ? onClose : undefined} blur className={backdropClassName} />

          <div
            ref={panelRef}
            tabIndex={-1}
            className={`
              relative z-10 w-full ${maxWidth}
              bg-surface-raised
              rounded-2xl 
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
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--cl-yellow-500)_12%,transparent)] text-[var(--cl-yellow-500)]">
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

                {/* Header action slot — between title block and close button */}
                {activeAction && (
                  <div className="flex-shrink-0 ml-auto mr-2">
                    {activeAction}
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

            {/* Sticky footer — flex-shrink-0, never scrolls away */}
            {(footerSlot ?? footer) && (
              <div className="flex-shrink-0 px-6 pb-5">
                {footerSlot ?? footer}
              </div>
            )}
          </div>
        </div>
      </Portal>
    </DialogFooterContext.Provider>
    </DialogHeaderContext.Provider>
  )
}

Dialog.displayName = 'Dialog'
