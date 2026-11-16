import { chmodSync, mkdtempSync, readdirSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { createKeychain } from './factory'
import { FileKeychainBackend } from './file-backend'
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

describe('createKeychain fallback policy', () => {
  it('falls back to 0600 files with a warning when the OS keychain is unavailable', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lf-kc-'))
    const writes: string[] = []
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation((c) => (writes.push(String(c)), true))
    const backend = await createKeychain({ env: {}, fileRoot: join(dir, 'keys') })
    spy.mockRestore()
    expect(backend.id).toBe('file')
    expect(writes.join('')).toContain(join(dir, 'keys'))
    await backend.setSecret({ service: 'svc', account: 'a', secret: 'value' })
    const files = readdirSync(join(dir, 'keys'))
    expect(statSync(join(dir, 'keys', files[0])).mode & 0o777).toBe(0o600)
    expect(statSync(join(dir, 'keys')).mode & 0o777).toBe(0o700)
  })

  it('tightens permissions on existing fallback files when read', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lf-kc-'))
    const backend = new FileKeychainBackend(join(dir, 'keys'))
    await backend.setSecret({ service: 'svc', account: 'a', secret: 'value' })
    const file = join(dir, 'keys', readdirSync(join(dir, 'keys'))[0])
    chmodSync(file, 0o644)
    expect(await backend.getSecret({ service: 'svc', account: 'a' })).toBe('value')
    expect(statSync(file).mode & 0o777).toBe(0o600)
  })

  it('fails closed when LF_GATEWAY_REQUIRE_KEYCHAIN=1', async () => {
    const backend = await createKeychain({ env: { LF_GATEWAY_REQUIRE_KEYCHAIN: '1' } })
    expect(backend.id).toBe('unavailable')
    await expect(backend.setSecret({ service: 'svc', account: 'a', secret: 'v' })).rejects.toThrow(
      /keychain_unavailable/
    )
  })

  it('uses the file backend when explicitly requested', async () => {
    const backend = await createKeychain({ env: { LF_GATEWAY_KEY_FILE_FALLBACK: '1' } })
    expect(backend.id).toBe('file')
  })
})
