import { createKeychain } from './factory'
import type { AccountInfo, KeychainBackend, SecretRef, SecretWrite } from './types'

/**
 * Default singleton keychain. Construction is lazy so importing this module
 * never triggers a native binding load.
 */
class DefaultKeychain {
  private backendPromise: Promise<KeychainBackend> | null = null

  private resolveBackend(): Promise<KeychainBackend> {
    if (!this.backendPromise) {
      this.backendPromise = createKeychain()
    }
    return this.backendPromise
  }

  async getBackend(): Promise<KeychainBackend> {
    return this.resolveBackend()
  }

  async getSecret(ref: SecretRef): Promise<string | null> {
    return (await this.resolveBackend()).getSecret(ref)
  }

  async setSecret(ref: SecretWrite): Promise<void> {
    return (await this.resolveBackend()).setSecret(ref)
  }

  async deleteSecret(ref: SecretRef): Promise<boolean> {
    return (await this.resolveBackend()).deleteSecret(ref)
  }

  async findAccounts(ref: { service: string }): Promise<AccountInfo[]> {
    return (await this.resolveBackend()).findAccounts(ref)
  }

  /** For tests: replace the backend factory with a known instance. */
  __setBackendForTesting(backend: KeychainBackend): void {
    this.backendPromise = Promise.resolve(backend)
  }
}

export const keychain = new DefaultKeychain()
