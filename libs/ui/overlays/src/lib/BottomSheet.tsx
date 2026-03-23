import React, { useEffect, useRef } from 'react'
import { Portal } from './Portal'
import { Backdrop } from './Backdrop'

export interface BottomSheetProps {
  open: boolean
  onClose?: () => void
  title?: string
  /** Height class, e.g. 'max-h-[60vh]' */
  maxHeight?: string
  children: React.ReactNode
  dismissOnBackdrop?: boolean
  className?: string
}

/**
 * Mobile-first bottom sheet panel. On web it anchors to the bottom of the screen.
 * For React Native, use a native bottom sheet library.
 *
 * @example
 * <BottomSheet open={isOpen} onClose={close} title="Options">
 *   <ActionList />
 * </BottomSheet>
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onClose,
  title,
  maxHeight = 'max-h-[75dvh]',
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
        <Backdrop visible onDismiss={dismissOnBackdrop ? onClose : undefined} blur />

        <div
          ref={panelRef}
          tabIndex={-1}
          className={`
            fixed bottom-0 left-0 right-0
            ${maxHeight}
            bg-surface-raised
            rounded-t-2xl
            shadow-neu-4
            border-t border-surface-border
            flex flex-col
            animate-in slide-in-from-bottom duration-normal ease-spring
            focus:outline-none
            ${className}
          `}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="h-1 w-10 rounded-full bg-greyscale-300 dark:bg-greyscale-600" />
          </div>

          {/* Header */}
          {(title || onClose) && (
            <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border flex-shrink-0">
              {title && (
                <h2 className="text-base font-semibold text-greyscale-900 dark:text-greyscale-50">
                  {title}
                </h2>
              )}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
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

BottomSheet.displayName = 'BottomSheet'
