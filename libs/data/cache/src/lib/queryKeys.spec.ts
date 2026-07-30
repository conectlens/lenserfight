import { describe, expect, it } from 'vitest'

import { queryKeys } from './queryKeys'

describe('queryKeys.agents.byOwner', () => {
  it('returns a stable, namespaced array for a given owner id', () => {
    expect(queryKeys.agents.byOwner('owner-1')).toEqual([
      'agents',
      'byOwner',
      'owner-1',
    ])
  })

  it('produces the identical key for the same owner id across call sites', () => {
    // useAgents and useAgentWorkspaceData must key the owner-fleet read the
    // same way so React Query shares a single cache entry.
    expect(queryKeys.agents.byOwner('owner-1')).toEqual(
      queryKeys.agents.byOwner('owner-1')
    )
  })

  it('produces distinct keys for different owner ids', () => {
    expect(queryKeys.agents.byOwner('owner-1')).not.toEqual(
      queryKeys.agents.byOwner('owner-2')
    )
  })
})
