import type { AccountInfo, KeychainBackend } from './types'

export const KEYCHAIN_UNAVAILABLE_MESSAGE =
  'OS keychain is unavailable and LF_GATEWAY_REQUIRE_KEYCHAIN=1 forbids file storage. ' +
  'Unset LF_GATEWAY_REQUIRE_KEYCHAIN to allow the 0600 file fallback.'

/**
 * Backend returned in strict mode (LF_GATEWAY_REQUIRE_KEYCHAIN=1) when no OS keychain is available. Every operation fails with an actionable error so
 * secrets are never silently written unencrypted.
 */
export class UnavailableKeychainBackend implements KeychainBackend {
  readonly id = 'unavailable' as const

  private fail(): never {
    throw new Error(`keychain_unavailable: ${KEYCHAIN_UNAVAILABLE_MESSAGE}`)
  }

  async getSecret(): Promise<string | null> {
    return this.fail()
  }

  async setSecret(): Promise<void> {
    return this.fail()
  }

  async deleteSecret(): Promise<boolean> {
    return this.fail()
  }

  async findAccounts(): Promise<AccountInfo[]> {
    return this.fail()
  }
}
