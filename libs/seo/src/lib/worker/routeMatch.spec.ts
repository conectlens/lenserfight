import { describe, expect, it } from 'vitest'
import { matchEntityRoute } from './routeMatch'

describe('matchEntityRoute', () => {
  it('matches each entity route to its kind + key', () => {
    expect(matchEntityRoute('/lenses/abc-123')).toEqual({ kind: 'lens', key: 'abc-123' })
    expect(matchEntityRoute('/battles/my-battle')).toEqual({ kind: 'battle', key: 'my-battle' })
    expect(matchEntityRoute('/lenser/ofcskn')).toEqual({ kind: 'lenser', key: 'ofcskn' })
    expect(matchEntityRoute('/workflows/wf-1')).toEqual({ kind: 'workflow', key: 'wf-1' })
    expect(matchEntityRoute('/threads/t-1')).toEqual({ kind: 'thread', key: 't-1' })
    expect(matchEntityRoute('/ray/ai-agents')).toEqual({ kind: 'ray', key: 'ai-agents' })
  })

  it('collapses tab/subview suffixes to the base entity', () => {
    expect(matchEntityRoute('/lenser/ofcskn/followers')).toEqual({ kind: 'lenser', key: 'ofcskn' })
    expect(matchEntityRoute('/battles/my-battle/result')).toEqual({ kind: 'battle', key: 'my-battle' })
  })

  it('returns null for list routes', () => {
    expect(matchEntityRoute('/lenses')).toBeNull()
    expect(matchEntityRoute('/battles/browse')).toBeNull()
    expect(matchEntityRoute('/battles/templates')).toBeNull()
    expect(matchEntityRoute('/workflows/templates')).toBeNull()
  })

  it('returns null for create/compose sub-routes', () => {
    expect(matchEntityRoute('/battles/create')).toBeNull()
    expect(matchEntityRoute('/battles/new')).toBeNull()
    expect(matchEntityRoute('/threads/compose')).toBeNull()
  })

  it('returns null for home and private prefixes', () => {
    expect(matchEntityRoute('/')).toBeNull()
    expect(matchEntityRoute('/settings/profile')).toBeNull()
    expect(matchEntityRoute('/account')).toBeNull()
    expect(matchEntityRoute('/auth/callback')).toBeNull()
  })

  it('ignores trailing slashes and query strings', () => {
    expect(matchEntityRoute('/lenses/abc/?ref=x')).toEqual({ kind: 'lens', key: 'abc' })
  })
})
