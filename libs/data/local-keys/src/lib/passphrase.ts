/**
 * Master passphrase provider for the local key store.
 *
 * Resolution order:
 *   1. Process-cached value (per-instance, never exported).
 *   2. OS keychain via `@lenserfight/utils/keychain` under service
 *      `lenserfight-keys`, account `master`.
 *   3. Env var `LENSERFIGHT_KEYS_PASSPHRASE` — only honored when the
 *      keychain is unavailable, OR `LENSERFIGHT_KEYS_PASSPHRASE_FORCE_ENV=1`
 *      is set explicitly (documented CI escape hatch).
 *
 * The passphrase is NEVER written to any file under `~/.lenserfight/`.
 */

import { keychain } from '@lenserfight/utils/keychain'

import { LocalKeyStoreError } from './ports'

export const KEYCHAIN_SERVICE = 'lenserfight-keys'
export const KEYCHAIN_ACCOUNT = 'master'
export const ENV_PASSPHRASE = 'LENSERFIGHT_KEYS_PASSPHRASE'
export const ENV_FORCE_ENV = 'LENSERFIGHT_KEYS_PASSPHRASE_FORCE_ENV'

export interface PassphraseProviderDeps {
  /** Test seam — overrides the keychain singleton. */
  keychainAdapter?: {
    getSecret(ref: { service: string; account: string }): Promise<string | null>
    setSecret(ref: { service: string; account: string; secret: string }): Promise<void>
    deleteSecret(ref: { service: string; account: string }): Promise<boolean>
  }
  env?: NodeJS.ProcessEnv
}

export class PassphraseProvider {
  private cached: string | null = null
  private readonly deps: Required<Pick<PassphraseProviderDeps, 'env'>> & {
    keychainAdapter: NonNullable<PassphraseProviderDeps['keychainAdapter']>
  }

  constructor(deps: PassphraseProviderDeps = {}) {
    this.deps = {
      keychainAdapter: deps.keychainAdapter ?? {
        getSecret: (ref) => keychain.getSecret(ref),
        setSecret: (ref) => keychain.setSecret(ref),
        deleteSecret: (ref) => keychain.deleteSecret(ref),
      },
      env: deps.env ?? process.env,
    }
  }

  /** Returns the master passphrase, raising if none is configured. */
  async get(): Promise<string> {
    if (this.cached !== null) return this.cached

    const fromKeychain = await this.tryKeychain()
    const envValue = this.deps.env[ENV_PASSPHRASE]
    const forceEnv = this.deps.env[ENV_FORCE_ENV] === '1'

    if (fromKeychain && envValue && !forceEnv) {
      // Both available → keychain wins. We intentionally do NOT log the env
      // value, but we do warn so the operator notices the conflict.
      this.warn(
        `Both ${ENV_PASSPHRASE} and OS keychain hold a master passphrase. ` +
          `Using the keychain value. Set ${ENV_FORCE_ENV}=1 to override.`
      )
    }

    if (fromKeychain && !forceEnv) {
      this.cached = fromKeychain
      return fromKeychain
    }

    if (envValue) {
      this.cached = envValue
      return envValue
    }

    throw new LocalKeyStoreError(
      'passphrase_missing',
      `No master passphrase configured. Run \`lf keys init\` or set ${ENV_PASSPHRASE}.`
    )
  }

  /** Stores a new passphrase in the OS keychain (idempotent overwrite). */
  async set(passphrase: string): Promise<void> {
    if (passphrase.length < 16) {
      throw new LocalKeyStoreError(
        'passphrase_invalid',
        'Master passphrase must be at least 16 characters'
      )
    }
    await this.deps.keychainAdapter.setSecret({
      service: KEYCHAIN_SERVICE,
      account: KEYCHAIN_ACCOUNT,
      secret: passphrase,
    })
    this.cached = passphrase
  }

  /** Returns true if a passphrase is configured (keychain or env). */
  async isConfigured(): Promise<boolean> {
    if (this.cached !== null) return true
    const fromKeychain = await this.tryKeychain()
    if (fromKeychain) return true
    return Boolean(this.deps.env[ENV_PASSPHRASE])
  }

  /** Wipes the in-memory cache; used by tests after env mutations. */
  __resetForTests(): void {
    this.cached = null
  }

  private async tryKeychain(): Promise<string | null> {
    try {
      return await this.deps.keychainAdapter.getSecret({
        service: KEYCHAIN_SERVICE,
        account: KEYCHAIN_ACCOUNT,
      })
    } catch (err) {
      this.warn(`Keychain read failed: ${(err as Error).message}`)
      return null
    }
  }

  private warn(msg: string): void {
    if (typeof process !== 'undefined' && process.stderr?.write) {
      process.stderr.write(`[local-keys] ${msg}\n`)
    }
  }
}

export const defaultPassphraseProvider = new PassphraseProvider()
