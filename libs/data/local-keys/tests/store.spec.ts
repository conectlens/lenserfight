import { mkdtempSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'

import { getKeyFilePath, getKeysDir } from '../src/lib/paths'
import { PassphraseProvider } from '../src/lib/passphrase'
import { LocalKeyStoreError } from '../src/lib/ports'
import { LocalKeyStore } from '../src/lib/store'

const PASS = 'a-strong-test-passphrase-that-is-long-enough'

function inMemoryKeychain() {
  const store = new Map<string, string>()
  const key = (s: string, a: string) => `${s}::${a}`
  return {
    getSecret: async (ref: { service: string; account: string }) => store.get(key(ref.service, ref.account)) ?? null,
    setSecret: async (ref: { service: string; account: string; secret: string }) => {
      store.set(key(ref.service, ref.account), ref.secret)
    },
    deleteSecret: async (ref: { service: string; account: string }) => store.delete(key(ref.service, ref.account)),
  }
}

function newStore() {
  const dir = mkdtempSync(join(tmpdir(), 'lf-keys-store-'))
  const env: NodeJS.ProcessEnv = { LENSERFIGHT_KEYS_DIR: join(dir, 'keys') }
  const passphrases = new PassphraseProvider({
    keychainAdapter: inMemoryKeychain(),
    env,
  })
  return {
    env,
    passphrases,
    store: new LocalKeyStore({ env, passphraseProvider: passphrases }),
  }
}

describe('LocalKeyStore', () => {
  let bag: ReturnType<typeof newStore>

  beforeEach(async () => {
    bag = newStore()
    await bag.passphrases.set(PASS)
  })

  it('add then list returns the new key metadata (no ciphertext leaked)', async () => {
    const created = await bag.store.add({ provider: 'openai', label: 'Prod', rawKey: 'sk-secret-XYZ' })
    const items = await bag.store.list()
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      id: created.id,
      provider: 'openai',
      label: 'Prod',
    })
    // Type-level guarantee: metadata has no ciphertext field. Verify at runtime too.
    expect(JSON.stringify(items)).not.toContain('sk-secret-XYZ')
    expect(JSON.stringify(items)).not.toContain('ciphertext')
  })

  it('resolve returns the original plaintext', async () => {
    const created = await bag.store.add({ provider: 'openai', label: 'Prod', rawKey: 'sk-roundtrip' })
    expect(await bag.store.resolve(created.id)).toBe('sk-roundtrip')
  })

  it('resolve refuses an id that does not match the pattern (path traversal)', async () => {
    await expect(bag.store.resolve('../etc/passwd')).rejects.toMatchObject({
      code: 'invalid_key_id',
    })
  })

  it('add refuses to overwrite when the id collides', async () => {
    const fixedId = 'collision-fixed-1234567890abcd'
    const passphrases = bag.passphrases
    const store = new LocalKeyStore({
      env: bag.env,
      passphraseProvider: passphrases,
      idGenerator: () => fixedId,
    })
    await store.add({ provider: 'openai', label: 'A', rawKey: 'a' })
    await expect(store.add({ provider: 'openai', label: 'B', rawKey: 'b' })).rejects.toMatchObject({
      code: 'duplicate_key',
    })
  })

  it('on-disk envelope never contains plaintext', async () => {
    const created = await bag.store.add({
      provider: 'openai',
      label: 'Prod',
      rawKey: 'sk-disktest-unique-987',
    })
    const path = getKeyFilePath(created.id, bag.env)
    const raw = readFileSync(path, 'utf-8')
    expect(raw).not.toContain('sk-disktest-unique-987')
    if (process.platform !== 'win32') {
      const mode = statSync(path).mode & 0o777
      expect(mode).toBe(0o600)
    }
  })

  it('update with new rawKey re-encrypts atomically', async () => {
    const created = await bag.store.add({ provider: 'openai', label: 'Prod', rawKey: 'before' })
    const updated = await bag.store.update({ id: created.id, rawKey: 'after' })
    expect(updated.id).toBe(created.id)
    expect(await bag.store.resolve(created.id)).toBe('after')
    // No leftover .next file
    const dir = getKeysDir(bag.env)
    const fs = await import('node:fs/promises')
    const entries = await fs.readdir(dir)
    expect(entries.some((e) => e.endsWith('.next'))).toBe(false)
  })

  it('update label only keeps the same ciphertext-decrypting plaintext', async () => {
    const created = await bag.store.add({ provider: 'openai', label: 'Old', rawKey: 'sk-keep' })
    await bag.store.update({ id: created.id, label: 'New' })
    expect(await bag.store.resolve(created.id)).toBe('sk-keep')
    const items = await bag.store.list()
    expect(items.find((k) => k.id === created.id)?.label).toBe('New')
  })

  it('remove deletes the file and resolve fails afterwards', async () => {
    const created = await bag.store.add({ provider: 'openai', label: 'Prod', rawKey: 'sk-bye' })
    await bag.store.remove(created.id)
    await expect(bag.store.resolve(created.id)).rejects.toMatchObject({ code: 'key_not_found' })
  })

  it('list returns [] before any keys are added', async () => {
    expect(await bag.store.list()).toEqual([])
  })

  it('resolve raises passphrase_missing when no passphrase is configured', async () => {
    const fresh = newStore()
    await expect(
      fresh.store.add({ provider: 'openai', label: 'X', rawKey: 'sk' })
    ).rejects.toMatchObject({ code: 'passphrase_missing' })
  })

  it('list skips files that are not envelopes', async () => {
    const fs = await import('node:fs/promises')
    const dir = getKeysDir(bag.env)
    await fs.mkdir(dir, { recursive: true, mode: 0o700 })
    await fs.writeFile(join(dir, 'not-an-envelope.json'), 'this is not json', { mode: 0o600 })
    expect(await bag.store.list()).toEqual([])
  })

  it('doctor flags world-readable files', async () => {
    if (process.platform === 'win32') return
    const created = await bag.store.add({ provider: 'openai', label: 'Prod', rawKey: 'sk-x' })
    const fs = await import('node:fs/promises')
    await fs.chmod(getKeyFilePath(created.id, bag.env), 0o644)
    const report = await bag.store.doctor()
    expect(report.fileIssues.some((i) => i.issue === 'world_readable')).toBe(true)
  })

  it('doctor flags tampered envelopes', async () => {
    const created = await bag.store.add({ provider: 'openai', label: 'Prod', rawKey: 'sk-x' })
    const fs = await import('node:fs/promises')
    await fs.writeFile(getKeyFilePath(created.id, bag.env), 'garbage', { mode: 0o600 })
    const report = await bag.store.doctor()
    expect(report.fileIssues.some((i) => i.issue === 'corrupt_envelope')).toBe(true)
  })

  it('LocalKeyStoreError surfaces a typed code for resolve failures', async () => {
    let err: unknown
    try {
      await bag.store.resolve('does-not-exist-1234567890abcd')
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(LocalKeyStoreError)
    expect((err as LocalKeyStoreError).code).toBe('key_not_found')
  })
})
