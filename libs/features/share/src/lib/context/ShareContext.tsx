import React, { createContext, useContext, useState } from 'react'
import { ShareResourceType } from '@lenserfight/types'

export interface ShareConfig {
  title: string
  resourceType: ShareResourceType
  resourceId: string
  slug?: string
}

interface ShareContextType {
  shareConfig: ShareConfig | null
  setShareConfig: (config: ShareConfig | null) => void
}

const ShareContext = createContext<ShareContextType | undefined>(undefined)

export const ShareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [shareConfig, setShareConfig] = useState<ShareConfig | null>(null)

  return (
    <ShareContext.Provider value={{ shareConfig, setShareConfig }}>
      {children}
    </ShareContext.Provider>
  )
}

export const useShareContext = () => {
  const context = useContext(ShareContext)
  if (!context) throw new Error('useShareContext must be used within ShareProvider')
  return context
}
