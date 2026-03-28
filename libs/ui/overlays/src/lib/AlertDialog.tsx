import React from 'react'
import { Dialog, DialogProps } from './Dialog'
import { ModalFooter } from './ModalFooter'

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
  return (
    <Dialog
      {...dialogProps}
      onClose={onClose}
      maxWidth="max-w-sm"
      dismissOnBackdrop={false}
      footer={
        <ModalFooter
          leftButton={{ label: cancelLabel, onClick: onClose, variant: 'secondary' }}
          primaryButton={{
            label: confirmAction.loading ? '…' : confirmAction.label,
            onClick: confirmAction.onClick,
            disabled: confirmAction.loading,
            variant: variant === 'destructive' ? 'danger' : 'primary',
          }}
        />
      }
    >
      {bodyText && (
        <p className="text-sm text-greyscale-600 dark:text-greyscale-400 mb-6">{bodyText}</p>
      )}
      {children}
    </Dialog>
  )
}

AlertDialog.displayName = 'AlertDialog'
