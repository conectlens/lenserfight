import React, { createContext, useCallback, useContext, useState } from 'react'

interface ThreadSheetContextValue {
  isOpen: boolean
  editData: EditThreadData | null
  open: (editData?: EditThreadData) => void
  close: () => void
}

export interface EditThreadData {
  id: string
  title: string
  content: string
  tags: string[]
  visibility: 'public' | 'community' | 'followers' | 'private'
}

const ThreadSheetContext = createContext<ThreadSheetContextValue | null>(null)

export const ThreadSheetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [editData, setEditData] = useState<EditThreadData | null>(null)

  const open = useCallback((data?: EditThreadData) => {
    setEditData(data ?? null)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setEditData(null)
  }, [])

  return (
    <ThreadSheetContext.Provider value={{ isOpen, editData, open, close }}>
      {children}
    </ThreadSheetContext.Provider>
  )
}

export function useThreadSheet(): ThreadSheetContextValue {
  const ctx = useContext(ThreadSheetContext)
  if (!ctx) throw new Error('useThreadSheet must be used inside ThreadSheetProvider')
  return ctx
}
