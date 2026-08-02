import { beforeEach, describe, expect, it } from 'vitest'

import {
  __resetOpencodeRegistryForTests,
  getOpencodeToolAdapter,
  listOpencodeToolAdapters,
  registerOpencodeToolAdapter,
  unregisterOpencodeToolAdapter,
} from './opencode.registry'

import type { OpencodeToolAdapterV1 } from './opencode-tool-adapter'

function makeAdapter(id: string): OpencodeToolAdapterV1 {
  return {
    id: () => id,
    metadata: () => ({ description: id, mirrorsMcpTool: id }),
    toToolDefinition: () => ({
      description: id,
      args: {},
      execute: async () => id,
    }),
  }
}

beforeEach(() => {
  __resetOpencodeRegistryForTests()
})

describe('opencode tool registry', () => {
  it('throws when looking up an unregistered id', () => {
    expect(() => getOpencodeToolAdapter('ghost')).toThrow(/Unknown opencode tool adapter/)
  })

  it('registers and looks up by id', () => {
    registerOpencodeToolAdapter('a', () => makeAdapter('a'))
    expect(getOpencodeToolAdapter('a').id()).toBe('a')
  })

  it('listOpencodeToolAdapters returns all registered ids simultaneously', () => {
    registerOpencodeToolAdapter('a', () => makeAdapter('a'))
    registerOpencodeToolAdapter('b', () => makeAdapter('b'))
    expect(listOpencodeToolAdapters().sort()).toEqual(['a', 'b'])
  })

  it('unregister removes the adapter', () => {
    registerOpencodeToolAdapter('a', () => makeAdapter('a'))
    unregisterOpencodeToolAdapter('a')
    expect(() => getOpencodeToolAdapter('a')).toThrow(/Unknown opencode tool adapter/)
  })

  it('rejects empty id', () => {
    expect(() => registerOpencodeToolAdapter('', () => makeAdapter('x'))).toThrow(/non-empty/)
  })
})
