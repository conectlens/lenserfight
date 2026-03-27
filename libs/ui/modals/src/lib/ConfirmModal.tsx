import { AlertTriangle } from 'lucide-react'
import React from 'react'
import { Dialog, ModalFooter } from '@lenserfight/ui/overlays'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  isLoading?: boolean
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  isLoading = false,
}) => {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={title}
      icon={<AlertTriangle size={18} />}
      maxWidth="max-w-sm"
      footer={
        <ModalFooter
          border={false}
          leftButton={{ label: 'Cancel', onClick: onClose, disabled: isLoading, variant: 'secondary', className: 'flex-1' }}
          primaryButton={{ label: confirmLabel, onClick: onConfirm, isLoading, variant: 'danger', className: 'flex-1 bg-red-600 hover:bg-red-700 text-white' }}
        />
      }
    >
      <p className="text-sm leading-relaxed text-greyscale-600 dark:text-greyscale-400 text-center">{message}</p>
    </Dialog>
  )
}
