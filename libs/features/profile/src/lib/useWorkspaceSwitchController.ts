import type { WorkspaceIdentity } from '@lenserfight/types'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { useLenserWorkspace } from './useLenserWorkspace'

function getProfileDestination(profile: WorkspaceIdentity): string {
  return profile.type === 'ai'
    ? `/lenser/${profile.handle}/ag/overview`
    : `/lenser/${profile.handle}`
}

export function useWorkspaceSwitchController() {
  const navigate = useNavigate()
  const { workspaces, switchWorkspace, isSwitching } = useLenserWorkspace()

  const switchToProfile = useCallback(
    async (target: WorkspaceIdentity | string | null | undefined) => {
      const targetProfile =
        typeof target === 'string'
          ? workspaces.find((profile) => profile.id === target) ?? null
          : target

      if (!targetProfile) {
        throw new Error('Target profile not found.')
      }

      await switchWorkspace(targetProfile.id)
      navigate(getProfileDestination(targetProfile))
      return targetProfile
    },
    [navigate, switchWorkspace, workspaces]
  )

  return {
    isSwitching,
    switchToProfile,
  }
}
