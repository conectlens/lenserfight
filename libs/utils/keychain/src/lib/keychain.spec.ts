import { describe, expect, it } from 'vitest'

import { MemoryKeychainBackend } from './memory-backend'

describe('MemoryKeychainBackend', () => {
  it('round-trips secrets per (service, account)', async () => {
    const backend = new MemoryKeychainBackend()
    await backend.setSecret({ service: 'svc', account: 'a', secret: 'one' })
    await backend.setSecret({ service: 'svc', account: 'b', secret: 'two' })
    expect(await backend.getSecret({ service: 'svc', account: 'a' })).toBe('one')
    expect(await backend.getSecret({ service: 'svc', account: 'b' })).toBe('two')
  })

  it('lists accounts for a service', async () => {
    const backend = new MemoryKeychainBackend()
    await backend.setSecret({ service: 'svc', account: 'a', secret: 'one' })
    await backend.setSecret({ service: 'other', account: 'x', secret: 'y' })
    const list = await backend.findAccounts({ service: 'svc' })
    expect(list.map((l) => l.account)).toEqual(['a'])
  })

  it('returns null for unknown secret', async () => {
    const backend = new MemoryKeychainBackend()
    expect(await backend.getSecret({ service: 'svc', account: 'missing' })).toBeNull()
  })

  it('deletes secrets', async () => {
    const backend = new MemoryKeychainBackend()
    await backend.setSecret({ service: 'svc', account: 'a', secret: 'one' })
    expect(await backend.deleteSecret({ service: 'svc', account: 'a' })).toBe(true)
    expect(await backend.deleteSecret({ service: 'svc', account: 'a' })).toBe(false)
  })
})
