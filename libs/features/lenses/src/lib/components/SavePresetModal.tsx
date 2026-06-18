import { Button } from '@lenserfight/ui/components'
import { Dialog, ModalFooter } from '@lenserfight/ui/overlays'
import React, { useState, useEffect } from 'react'

interface SavePresetModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, note: string) => void
  isSaving: boolean
}

export const SavePresetModal: React.FC<SavePresetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isSaving,
}) => {
  const [name, setName] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (isOpen) {
      setName('')
      setNote('')
    }
  }, [isOpen])

  const trimmedName = name.trim()
  const canSave = trimmedName.length > 0 && !isSaving

  const handleSave = () => {
    if (!canSave) return
    onSave(trimmedName, note.trim())
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Save preset"
      maxWidth="max-w-sm"
      footer={
        <ModalFooter
          leftButton={{
            label: 'Cancel',
            onClick: onClose,
            disabled: isSaving,
            variant: 'secondary',
          }}
          primaryButton={{
            label: 'Save',
            onClick: handleSave,
            isLoading: isSaving,
            disabled: !canSave,
          }}
        />
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-greyscale-600 dark:text-greyscale-400">
            Preset name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. 'Formal tone, 500 words'"
            autoFocus
            className="w-full rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-sm text-greyscale-900 dark:text-greyscale-50 placeholder:text-greyscale-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-greyscale-600 dark:text-greyscale-400">
            Note <span className="text-greyscale-400">(optional)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a short description..."
            rows={3}
            className="w-full rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-sm text-greyscale-900 dark:text-greyscale-50 placeholder:text-greyscale-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
          />
        </div>
      </div>
    </Dialog>
  )
}
