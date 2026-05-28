interface ResolveOwnerFleetOwnerIdArgs {
  ownerHumanLenserId?: string | null
  agentOwnerLenserId?: string | null
  viewedProfileId: string | null
  viewedProfileType: 'human' | 'ai' | null
}

export function resolveOwnerFleetOwnerId({
  ownerHumanLenserId,
  agentOwnerLenserId,
  viewedProfileId,
  viewedProfileType,
}: ResolveOwnerFleetOwnerIdArgs): string | null {
  if (ownerHumanLenserId) return ownerHumanLenserId
  if (agentOwnerLenserId) return agentOwnerLenserId
  if (viewedProfileType === 'human' && viewedProfileId) return viewedProfileId
  return null
}
