/**
 * ConfigFormFooter — Cancel / Save button pair for config panels.
 */

import { Button } from '@lenserfight/ui/components'
import React from 'react'

export interface ConfigFormFooterProps {
  onSave: () => void
  onClose: () => void
  disabled?: boolean
}

export function ConfigFormFooter({ onSave, onClose, disabled }: ConfigFormFooterProps) {
  return (
    <div className="flex items-center justify-end gap-2 pt-4 border-t border-surface-border">
      <Button variant="secondary" size="sm" onClick={onClose} className="w-auto">
        Cancel
      </Button>
      <Button size="sm" onClick={onSave} disabled={disabled} className="w-auto px-4">
        Save
      </Button>
    </div>
  )
}
