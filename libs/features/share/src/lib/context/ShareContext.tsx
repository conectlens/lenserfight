import React, { createContext, useContext, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ShareResourceType } from '@lenserfight/types'

export interface ShareConfig {
  title: string
  resourceType: ShareResourceType
  resourceId?: string
  slug?: string
}

interface ShareContextType {
  shareConfig: ShareConfig
  setShareConfig: (config: ShareConfig | null) => void
}

const ShareContext = createContext<ShareContextType | undefined>(undefined)

function pageConfigFromPath(pathname: string): ShareConfig {
  return { title: 'LenserFight', resourceType: 'page', slug: pathname }
}

export const ShareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation()
  const [override, setOverride] = useState<ShareConfig | null>(null)

  // Reset override whenever the route changes so stale entity configs don't linger
  useEffect(() => {
    setOverride(null)
  }, [location.pathname])

  const shareConfig = override ?? pageConfigFromPath(location.pathname)

  return (
    <ShareContext.Provider value={{ shareConfig, setShareConfig: setOverride }}>
      {children}
    </ShareContext.Provider>
  )
}

export const useShareContext = () => {
  const context = useContext(ShareContext)
  if (!context) throw new Error('useShareContext must be used within ShareProvider')
  return context
}
