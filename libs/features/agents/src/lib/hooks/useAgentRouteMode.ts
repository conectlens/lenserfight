import { queryKeys } from '@lenserfight/data/cache'
import { lenserService } from '@lenserfight/data/repositories'
import { useLenserWorkspace } from '@lenserfight/features/profile'
import type { LenserProfileDTO, ProfileAccessPayload } from '@lenserfight/types'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

export type AgentRouteMode =
  | { kind: 'loading' }
  | { kind: 'not_found'; handle: string }
  | { kind: 'human_owner'; handle: string; profile: LenserProfileDTO }
  | { kind: 'human_public'; handle: string; profile: LenserProfileDTO }
  | { kind: 'agent_owner'; handle: string; profile: LenserProfileDTO }
  | { kind: 'agent_public'; handle: string; profile: LenserProfileDTO }

/**
 * Single source of truth for the four-mode resolution at /lenser/:handle/ag/...
 *
 * Mirrors the server-side `agents.can_manage_ai_lenser()` policy: the viewer
 * is treated as an owner when the viewed profile id appears in their workspace
 * list. The workspace list itself is hydrated by `useMyLensers` from the
 * platform's ownership table, so delegated agents owned through their parent
 * human account also surface as workspaces.
 *
 * Spec: docs/connected-lenses/frontend-integration.md#route-resolution-contract
 */
export function useAgentRouteMode(handle: string | undefined): AgentRouteMode {
  const { isOwnedWorkspace, workspaces, isLoading: workspacesLoading } = useLenserWorkspace()

  const { data: accessPayload, isLoading: profileLoading } = useQuery<
    ProfileAccessPayload | null
  >({
    queryKey: [...queryKeys.lenser.profile(handle ?? ''), 'agent-route-mode'],
    queryFn: () => lenserService.getProfile(handle!),
    enabled: !!handle,
    staleTime: 60_000,
  })

  return useMemo<AgentRouteMode>(() => {
    if (!handle) return { kind: 'not_found', handle: '' }
    if (profileLoading || workspacesLoading) return { kind: 'loading' }

    const profile = accessPayload?.profile ?? null
    if (!profile) return { kind: 'not_found', handle }

    const isOwner = isOwnedWorkspace(profile.id)
    // fn_lensers_get_profile does not return `type`; use the workspace list
    // (from fn_get_my_lensers which does return type) as the authoritative
    // source for owned profiles, falling back to profile.type for others.
    const workspaceEntry = workspaces.find((w) => w.id === profile.id)
    const isAgent = (workspaceEntry?.type ?? profile.type) === 'ai'

    if (isAgent) {
      return isOwner
        ? { kind: 'agent_owner', handle, profile }
        : { kind: 'agent_public', handle, profile }
    }
    return isOwner
      ? { kind: 'human_owner', handle, profile }
      : { kind: 'human_public', handle, profile }
  }, [handle, profileLoading, workspacesLoading, accessPayload, isOwnedWorkspace, workspaces])
}
