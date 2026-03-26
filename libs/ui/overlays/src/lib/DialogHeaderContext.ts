import React from 'react'

export interface DialogHeaderSlot {
  title?: string
  description?: string
  icon?: React.ReactNode
}

export interface DialogHeaderContextValue {
  /** Called by children (e.g. StepWizard) to override the Dialog header slot. */
  setHeader: (slot: DialogHeaderSlot) => void
  /** Called to clear an override (restores Dialog's own props). */
  clearHeader: () => void
}

export const DialogHeaderContext = React.createContext<DialogHeaderContextValue>({
  setHeader: () => undefined,
  clearHeader: () => undefined,
})
