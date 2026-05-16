import React from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose?: () => void
  title?: string
  children: React.ReactNode
  /** Optional footer rendered below the scrollable body (e.g. action buttons). */
  footer?: React.ReactNode
  canClose?: boolean
  panelClassName?: string
  contentClassName?: string
  /** Stretches the panel to full viewport width and height (minus padding). Overrides max-w-md default. */
  fullWidth?: boolean
}

/**
 * @deprecated Use `Dialog` from `@lenserfight/ui/overlays` together with
 * routing primitives from `@lenserfight/ui/routing` (`ModalRoute` or
 * `ModalQueryDriven`). This keeps modal visibility in the URL and gives
 * you browser back/forward, deep-linking, and centralised access control
 * for free. This component will be removed in a future major version.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  canClose = true,
  panelClassName = '',
  contentClassName = '',
  fullWidth = false,
}) => {
  const panelRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!isOpen) return

    const submitActiveForm = () => {
      const panel = panelRef.current
      if (!panel) return

      const activeElement = document.activeElement
      const activeForm =
        activeElement instanceof HTMLElement ? activeElement.closest('form') : null
      const form = activeForm ?? panel.querySelector('form')

      if (!(form instanceof HTMLFormElement)) return
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    }

    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        submitActiveForm()
        return
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={panelRef}
        className={[
          'bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col relative overflow-hidden transform transition-all border border-gray-100 dark:border-gray-700',
          fullWidth ? 'max-w-full' : 'max-w-md',
          panelClassName,
        ].join(' ')}
        role="dialog"
        aria-modal="true"
      >
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm flex-shrink-0 z-10">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate pr-4">
            {title}
          </h3>
          {canClose && onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
        <div className={['p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 w-full dark:text-gray-300', contentClassName].join(' ')}>
          {children}
        </div>
        {footer ? (
          <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 sm:px-6 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  )
}
