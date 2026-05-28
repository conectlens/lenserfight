import { beforeEach, describe, expect, it } from 'vitest'

import {
  __resetConnectorRegistryForTests,
  getConnectorAdapter,
  listConnectorAdapters,
  registerConnectorAdapter,
  setDefaultConnectorAdapter,
  unregisterConnectorAdapter,
} from './connector.registry'

import type { ConnectorAdapterV1 } from './connector-adapter'

function makeAdapter(id: string): ConnectorAdapterV1 {
  return {
    id: () => id,
    metadata: () => ({ slug: id, name: id, kind: 'api', scopes: [], isActive: true }),
    verify: async () => ({ ok: true, scopes: [] }),
    dispatch: async () => ({ ok: true, latencyMs: 0 }),
  }
}

beforeEach(() => {
  __resetConnectorRegistryForTests()
})

describe('connector registry', () => {
  it('throws when looking up an adapter before any registration', () => {
    expect(() => getConnectorAdapter()).toThrow(/No connector adapter/)
  })

  it('first registration becomes the default', () => {
    registerConnectorAdapter('a', () => makeAdapter('a'))
    expect(getConnectorAdapter().id()).toBe('a')
  })

  it('explicit lookup by id returns the matching adapter', () => {
    registerConnectorAdapter('a', () => makeAdapter('a'))
    registerConnectorAdapter('b', () => makeAdapter('b'))
    expect(getConnectorAdapter('b').id()).toBe('b')
  })

  it('setDefaultConnectorAdapter rejects unknown ids', () => {
    expect(() => setDefaultConnectorAdapter('ghost')).toThrow(/unregistered/)
  })

  it('listConnectorAdapters returns registered ids', () => {
    registerConnectorAdapter('a', () => makeAdapter('a'))
    registerConnectorAdapter('b', () => makeAdapter('b'))
    expect(listConnectorAdapters().sort()).toEqual(['a', 'b'])
  })

  it('unregister clears the default if it pointed at the removed adapter', () => {
    registerConnectorAdapter('a', () => makeAdapter('a'))
    unregisterConnectorAdapter('a')
    expect(() => getConnectorAdapter()).toThrow(/No connector adapter/)
  })

  it('rejects empty id', () => {
    expect(() => registerConnectorAdapter('', () => makeAdapter('x'))).toThrow(/non-empty/)
  })
})
