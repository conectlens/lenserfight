import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { useLenserWorkspace } from './useLenserWorkspace'

import type { LenserType } from '@lenserfight/types'

export interface WorkspaceSwitchTarget {
  id: string
  handle: string
  type?: LenserType
}

function getProfileDestination(profile: WorkspaceSwitchTarget): string {
  return profile.type === 'ai'
    ? `/lenser/${profile.handle}/ag/overview`
    : `/lenser/${profile.handle}`
}

export function useWorkspaceSwitchController() {
  const navigate = useNavigate()
  const { workspaces, activeWorkspace, switchWorkspace, isSwitching } = useLenserWorkspace()

  const switchToProfile = useCallback(
    async (target: WorkspaceSwitchTarget | string | null | undefined) => {
      const targetProfile =
        typeof target === 'string'
          ? workspaces.find((profile) => profile.id === target) ?? null
          : target

      if (!targetProfile) {
        throw new Error('Target profile not found.')
      }

      // Already on this workspace — only navigate, skip the RPC + cache invalidation.
      if (targetProfile.id === activeWorkspace?.id) {
        navigate(getProfileDestination(targetProfile))
        return targetProfile
      }

      await switchWorkspace(targetProfile.id)
      // Navigate synchronously so React batches the route change with the setQueryData
      // re-render from onSuccess. Using startTransition here defers the navigate as a
      // low-priority update, which gives the OLD route's components a window to observe
      // the new activeWorkspace and fire corrective auto-switch effects (e.g. the
      // AgentWorkspaceShell auto-switch effect), creating a ping-pong loop.
      navigate(getProfileDestination(targetProfile))
      return targetProfile
    },
    [navigate, switchWorkspace, workspaces, activeWorkspace?.id]
  )

  return {
    isSwitching,
    switchToProfile,
  }
}
