import { describe, expect, it } from 'vitest'

import { resolveOwnerFleetOwnerId } from './resolveOwnerFleetOwnerId'

describe('resolveOwnerFleetOwnerId', () => {
  it('prefers the authenticated human workspace id when available', () => {
    expect(
      resolveOwnerFleetOwnerId({
        ownerHumanLenserId: 'human-1',
        agentOwnerLenserId: 'human-2',
        viewedProfileId: 'ai-profile-1',
        viewedProfileType: 'ai',
      })
    ).toBe('human-1')
  })

  it('falls back to the agent owner id for AI workspaces', () => {
    expect(
      resolveOwnerFleetOwnerId({
        ownerHumanLenserId: null,
        agentOwnerLenserId: 'human-1',
        viewedProfileId: 'ai-profile-1',
        viewedProfileType: 'ai',
      })
    ).toBe('human-1')
  })

  it('uses the viewed profile id only for human owner views', () => {
    expect(
      resolveOwnerFleetOwnerId({
        ownerHumanLenserId: null,
        agentOwnerLenserId: null,
        viewedProfileId: 'human-1',
        viewedProfileType: 'human',
      })
    ).toBe('human-1')
  })

  it('does not treat an AI profile id as an owner id fallback', () => {
    expect(
      resolveOwnerFleetOwnerId({
        ownerHumanLenserId: null,
        agentOwnerLenserId: null,
        viewedProfileId: 'ai-profile-1',
        viewedProfileType: 'ai',
      })
    ).toBeNull()
  })
})
