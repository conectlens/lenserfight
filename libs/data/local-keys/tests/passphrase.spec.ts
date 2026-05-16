import { describe, expect, it } from 'vitest'

import {
  ENV_FORCE_ENV,
  ENV_PASSPHRASE,
  KEYCHAIN_ACCOUNT,
  KEYCHAIN_SERVICE,
  PassphraseProvider,
} from '../src/lib/passphrase'
import { LocalKeyStoreError } from '../src/lib/ports'

function memKeychain(initial?: Record<string, string>) {
  const store = new Map<string, string>(Object.entries(initial ?? {}))
  const key = (s: string, a: string) => `${s}::${a}`
  return {
    store,
    getSecret: async (ref: { service: string; account: string }) => store.get(key(ref.service, ref.account)) ?? null,
    setSecret: async (ref: { service: string; account: string; secret: string }) => {
      store.set(key(ref.service, ref.account), ref.secret)
    },
    deleteSecret: async (ref: { service: string; account: string }) => store.delete(key(ref.service, ref.account)),
  }
}

describe('PassphraseProvider', () => {
  it('reads the passphrase from the OS keychain', async () => {
    const adapter = memKeychain({ [`${KEYCHAIN_SERVICE}::${KEYCHAIN_ACCOUNT}`]: 'from-keychain-passphrase' })
    const p = new PassphraseProvider({ keychainAdapter: adapter, env: {} })
    expect(await p.get()).toBe('from-keychain-passphrase')
  })

  it('falls back to env var when the keychain is empty', async () => {
    const p = new PassphraseProvider({
      keychainAdapter: memKeychain(),
      env: { [ENV_PASSPHRASE]: 'from-env-passphrase' },
    })
    expect(await p.get()).toBe('from-env-passphrase')
  })

  it('prefers keychain over env, unless FORCE_ENV=1', async () => {
    const adapter = memKeychain({ [`${KEYCHAIN_SERVICE}::${KEYCHAIN_ACCOUNT}`]: 'from-keychain' })
    const p1 = new PassphraseProvider({ keychainAdapter: adapter, env: { [ENV_PASSPHRASE]: 'from-env' } })
    expect(await p1.get()).toBe('from-keychain')

    const p2 = new PassphraseProvider({
      keychainAdapter: adapter,
      env: { [ENV_PASSPHRASE]: 'from-env', [ENV_FORCE_ENV]: '1' },
    })
    expect(await p2.get()).toBe('from-env')
  })

  it('raises passphrase_missing when nothing is configured', async () => {
    const p = new PassphraseProvider({ keychainAdapter: memKeychain(), env: {} })
    let err: unknown
    try {
      await p.get()
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(LocalKeyStoreError)
    expect((err as LocalKeyStoreError).code).toBe('passphrase_missing')
  })

  it('set() refuses passphrases shorter than 16 chars', async () => {
    const p = new PassphraseProvider({ keychainAdapter: memKeychain(), env: {} })
    let err: unknown
    try {
      await p.set('too-short')
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(LocalKeyStoreError)
    expect((err as LocalKeyStoreError).code).toBe('passphrase_invalid')
  })

  it('isConfigured reports keychain or env presence without throwing', async () => {
    const empty = new PassphraseProvider({ keychainAdapter: memKeychain(), env: {} })
    expect(await empty.isConfigured()).toBe(false)
    const withKeychain = new PassphraseProvider({
      keychainAdapter: memKeychain({ [`${KEYCHAIN_SERVICE}::${KEYCHAIN_ACCOUNT}`]: 'x' }),
      env: {},
    })
    expect(await withKeychain.isConfigured()).toBe(true)
    const withEnv = new PassphraseProvider({
      keychainAdapter: memKeychain(),
      env: { [ENV_PASSPHRASE]: 'x' },
    })
    expect(await withEnv.isConfigured()).toBe(true)
  })

  it('__resetForTests clears the cache so env changes take effect', async () => {
    const env: NodeJS.ProcessEnv = { [ENV_PASSPHRASE]: 'first' }
    const p = new PassphraseProvider({ keychainAdapter: memKeychain(), env })
    expect(await p.get()).toBe('first')
    env[ENV_PASSPHRASE] = 'second'
    expect(await p.get()).toBe('first') // still cached
    p.__resetForTests()
    expect(await p.get()).toBe('second')
  })
})
