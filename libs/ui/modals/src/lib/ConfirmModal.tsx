import { AlertTriangle } from 'lucide-react'
import React from 'react'
import { Button } from '@lenserfight/ui/components'
import { Dialog } from '@lenserfight/ui/overlays'

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
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <p className="text-sm leading-relaxed text-greyscale-600 dark:text-greyscale-400">{message}</p>
        <div className="flex w-full gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isLoading} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            isLoading={isLoading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white focus:ring-red-200"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
