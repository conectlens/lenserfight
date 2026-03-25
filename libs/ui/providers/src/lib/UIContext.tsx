import React, { createContext, useCallback, useContext, useState, ReactNode } from 'react'

export interface ActionItem {
  label: string
  icon?: ReactNode
  onClick: () => void
  variant?: 'default' | 'danger'
}

interface UIContextType {
  pageActions: ActionItem[]
  setPageActions: React.Dispatch<React.SetStateAction<ActionItem[]>>
  pageTitle: string | null
  setPageTitle: React.Dispatch<React.SetStateAction<string | null>>
}

const UIContext = createContext<UIContextType | undefined>(undefined)

const areActionItemsEqual = (left: ActionItem[], right: ActionItem[]) => {
  if (left.length !== right.length) return false

  return left.every((item, index) => {
    const next = right[index]
    return item.label === next.label && item.variant === next.variant
  })
}

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pageActions, setPageActions] = useState<ActionItem[]>([])
  const [pageTitle, setPageTitle] = useState<string | null>(null)
  const updatePageActions = useCallback<React.Dispatch<React.SetStateAction<ActionItem[]>>>(
    (nextActions) => {
      setPageActions((currentActions) => {
        const resolvedActions =
          typeof nextActions === 'function' ? nextActions(currentActions) : nextActions

        return areActionItemsEqual(currentActions, resolvedActions)
          ? currentActions
          : resolvedActions
      })
    },
    [],
  )

  return (
    <UIContext.Provider
      value={{ pageActions, setPageActions: updatePageActions, pageTitle, setPageTitle }}
    >
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
