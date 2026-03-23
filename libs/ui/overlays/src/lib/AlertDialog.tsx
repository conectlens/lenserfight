import React from 'react'
import { Dialog, DialogProps } from './Dialog'

export interface AlertDialogAction {
  label: string
  onClick: () => void
  loading?: boolean
}

export interface AlertDialogProps
  extends Omit<DialogProps, 'children' | 'maxWidth'> {
  /** Primary destructive or confirmatory action */
  confirmAction: AlertDialogAction
  /** Secondary cancel action (defaults to onClose) */
  cancelLabel?: string
  variant?: 'destructive' | 'confirm'
  bodyText?: string
  children?: React.ReactNode
}

/**
 * Specialized dialog for destructive confirmations (delete, remove, etc.).
 * Forces the user to make an explicit choice.
 *
 * @example
 * <AlertDialog
 *   open={open}
 *   onClose={close}
 *   title="Delete account?"
 *   bodyText="This cannot be undone."
 *   variant="destructive"
 *   confirmAction={{ label: 'Delete', onClick: deleteAccount }}
 * />
 */
export const AlertDialog: React.FC<AlertDialogProps> = ({
  confirmAction,
  cancelLabel = 'Cancel',
  variant = 'destructive',
  bodyText,
  children,
  onClose,
  ...dialogProps
}) => {
  const confirmButtonClasses =
    variant === 'destructive'
      ? 'bg-status-red text-white hover:bg-red-600 focus-visible:ring-status-red/50'
      : 'bg-deep-lens-navy-500 text-white hover:bg-deep-lens-navy-600 focus-visible:ring-deep-lens-navy-500/50'

  return (
    <Dialog
      {...dialogProps}
      onClose={onClose}
      maxWidth="max-w-sm"
      dismissOnBackdrop={false}
    >
      {bodyText && (
        <p className="text-sm text-greyscale-600 dark:text-greyscale-400 mb-6">{bodyText}</p>
      )}
      {children}
      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-surface-border bg-surface-raised px-4 py-2 text-sm font-medium text-greyscale-700 dark:text-greyscale-300 hover:bg-greyscale-100 dark:hover:bg-greyscale-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500/50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={confirmAction.loading}
          onClick={confirmAction.onClick}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 disabled:opacity-50 ${confirmButtonClasses}`}
        >
          {confirmAction.loading ? '…' : confirmAction.label}
        </button>
      </div>
    </Dialog>
  )
}

AlertDialog.displayName = 'AlertDialog'
