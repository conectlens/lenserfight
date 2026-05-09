import { describe, expect, it } from 'vitest'

import {
  isCloudAuthoritative,
  isConflictAware,
  isLocalOnly,
  listObjectClasses,
  objectClassesByAuthority,
  pullableObjectClasses,
  pushableObjectClasses,
} from './object-classes'

describe('object-classes registry', () => {
  it('classifies cloud-authoritative classes', () => {
    expect(isCloudAuthoritative('xp_total')).toBe(true)
    expect(isCloudAuthoritative('agent_config')).toBe(false)
  })

  it('classifies local-only classes', () => {
    expect(isLocalOnly('byok_key')).toBe(true)
    expect(isLocalOnly('xp_total')).toBe(false)
  })

  it('classifies conflict-aware classes', () => {
    expect(isConflictAware('agent_config')).toBe(true)
    expect(isConflictAware('byok_key')).toBe(false)
  })

  it('lists all classes', () => {
    expect(listObjectClasses().length).toBeGreaterThan(15)
  })

  it('pushable classes exclude cloud and local-only', () => {
    const pushable = pushableObjectClasses()
    expect(pushable).not.toContain('xp_total')
    expect(pushable).not.toContain('byok_key')
    expect(pushable).toContain('agent_config')
  })

  it('pullable classes exclude local-only', () => {
    const pullable = pullableObjectClasses()
    expect(pullable).not.toContain('byok_key')
    expect(pullable).toContain('xp_total')
    expect(pullable).toContain('agent_config')
  })

  it('groups by authority', () => {
    expect(objectClassesByAuthority('cloud').length).toBeGreaterThan(0)
    expect(objectClassesByAuthority('local').length).toBeGreaterThan(0)
    expect(objectClassesByAuthority('conflict_aware').length).toBeGreaterThan(0)
  })
})
