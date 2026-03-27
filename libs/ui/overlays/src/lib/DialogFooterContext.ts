import React from 'react'

export interface DialogFooterContextValue {
  /** Called by children (e.g. StepWizard) to push a footer node into the Dialog's sticky slot. */
  setFooter: (node: React.ReactNode) => void
  /** Called to remove the footer override. */
  clearFooter: () => void
}

export const DialogFooterContext = React.createContext<DialogFooterContextValue>({
  setFooter: () => undefined,
  clearFooter: () => undefined,
})
