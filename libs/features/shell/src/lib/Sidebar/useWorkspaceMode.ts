import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

import type { Lenser } from '@lenserfight/types'

import type { SidebarMode } from './sidebarModes'

export function useWorkspaceMode(activeProfile: Lenser | null | undefined): SidebarMode {
  const location = useLocation()

  return useMemo(() => {
    if (!activeProfile?.handle || activeProfile.type !== 'ai') return 'human'
    if (location.pathname.startsWith(`/lenser/${activeProfile.handle}/ag`)) return 'agent'
    return 'human'
  }, [activeProfile?.handle, activeProfile?.type, location.pathname])
}
