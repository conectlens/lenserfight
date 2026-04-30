import { useCallback } from 'react'

import { useMyLensers } from './useMyLensers'
import { useSwitchLenser } from './useSwitchLenser'

export function useLenserWorkspace() {
  const { workspaces, activeWorkspace, humanWorkspace, isLoading } = useMyLensers()
  const { switchLenser, isSwitching } = useSwitchLenser()

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      await switchLenser(workspaceId)
    },
    [switchLenser]
  )

  const isOwnedWorkspace = useCallback(
    (workspaceId: string | null | undefined) => {
      if (!workspaceId) return false
      return activeWorkspace?.id === workspaceId || workspaces.some((workspace) => workspace.id === workspaceId)
    },
    [activeWorkspace?.id, workspaces]
  )

  return {
    workspaces,
    activeWorkspace,
    humanWorkspace,
    isLoading,
    isSwitching,
    isOwnedWorkspace,
    switchWorkspace,
  }
}
