import type { AccountInfo, KeychainBackend, SecretRef, SecretWrite } from './types'

/** In-memory backend, suitable only for unit tests. */
export class MemoryKeychainBackend implements KeychainBackend {
  readonly id = 'memory' as const
  private store = new Map<string, string>()

  async getSecret(ref: SecretRef): Promise<string | null> {
    return this.store.get(this.key(ref)) ?? null
  }

  async setSecret(ref: SecretWrite): Promise<void> {
    this.store.set(this.key(ref), ref.secret)
  }

  async deleteSecret(ref: SecretRef): Promise<boolean> {
    return this.store.delete(this.key(ref))
  }

  async findAccounts(ref: { service: string }): Promise<AccountInfo[]> {
    const out: AccountInfo[] = []
    for (const k of this.store.keys()) {
      const [service, account] = decode(k)
      if (service === ref.service) out.push({ service, account, present: true })
    }
    return out
  }

  private key(ref: SecretRef): string {
    return `${encode(ref.service)}::${encode(ref.account)}`
  }
}

function encode(s: string) {
  return Buffer.from(s, 'utf-8').toString('base64url')
}

function decode(k: string): [string, string] {
  const [s, a] = k.split('::')
  return [
    Buffer.from(s, 'base64url').toString('utf-8'),
    Buffer.from(a, 'base64url').toString('utf-8'),
  ]
}
