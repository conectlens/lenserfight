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

  return {
    workspaces,
    activeWorkspace,
    humanWorkspace,
    isLoading,
    isSwitching,
    switchWorkspace,
  }
}
