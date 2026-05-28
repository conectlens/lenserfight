import React, { createContext, useContext, useState, ReactNode } from 'react'

export interface ActionItem {
  label: string
  icon?: ReactNode
  onClick: () => void
  variant?: 'default' | 'danger'
}

interface UIContextType {
  pageActions: ActionItem[]
  setPageActions: (actions: ActionItem[]) => void
  pageTitle: string | null
  setPageTitle: (title: string | null) => void
}

const UIContext = createContext<UIContextType | undefined>(undefined)

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pageActions, setPageActions] = useState<ActionItem[]>([])
  const [pageTitle, setPageTitle] = useState<string | null>(null)

  return (
    <UIContext.Provider value={{ pageActions, setPageActions, pageTitle, setPageTitle }}>
      {children}
    </UIContext.Provider>
  )
}

export const useUI = () => {
  const context = useContext(UIContext)
  if (!context) {
    throw new Error('useUI must be used within a UIProvider')
  }
  return context
}
