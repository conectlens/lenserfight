import React, { createContext, useCallback, useContext, useState } from 'react'
import type { VisibilityEnum } from '@lenserfight/types'

export interface EditLensData {
  id: string
  title: string
  content: string
  tags: string[]
  visibility: VisibilityEnum
}

interface LensSheetContextValue {
  isOpen: boolean
  editData: EditLensData | null
  open: (editData?: EditLensData) => void
  close: () => void
}

const LensSheetContext = createContext<LensSheetContextValue | null>(null)

export const LensSheetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [editData, setEditData] = useState<EditLensData | null>(null)

  const open = useCallback((data?: EditLensData) => {
    setEditData(data ?? null)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setEditData(null)
  }, [])

  return (
    <LensSheetContext.Provider value={{ isOpen, editData, open, close }}>
      {children}
    </LensSheetContext.Provider>
  )
}

export function useLensSheet(): LensSheetContextValue {
  const ctx = useContext(LensSheetContext)
  if (!ctx) throw new Error('useLensSheet must be used inside LensSheetProvider')
  return ctx
}
