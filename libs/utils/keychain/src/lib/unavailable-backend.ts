import type { AccountInfo, KeychainBackend, SecretRef, SecretWrite } from './types'

export const KEYCHAIN_UNAVAILABLE_MESSAGE =
  'OS keychain is unavailable (the optional "keytar" package could not be loaded). ' +
  'Secrets are not written to plaintext files unless you opt in with LF_GATEWAY_KEY_FILE_FALLBACK=1 ' +
  '(insecure; intended for CI and headless containers).'

/**
 * Backend returned when no secure store is available and the plaintext file
 * fallback was not requested. Every operation fails with an actionable error so
 * secrets are never silently written unencrypted.
 */
export class UnavailableKeychainBackend implements KeychainBackend {
  readonly id = 'unavailable' as const

  private fail(): never {
    throw new Error(`keychain_unavailable: ${KEYCHAIN_UNAVAILABLE_MESSAGE}`)
  }

  async getSecret(_ref: SecretRef): Promise<string | null> {
    return this.fail()
  }

  async setSecret(_ref: SecretWrite): Promise<void> {
    return this.fail()
  }

  async deleteSecret(_ref: SecretRef): Promise<boolean> {
    return this.fail()
  }

  async findAccounts(_ref: { service: string }): Promise<AccountInfo[]> {
    return this.fail()
  }
}
