import type { AccountInfo, KeychainBackend, SecretRef, SecretWrite } from './types'

interface KeytarModule {
  getPassword(service: string, account: string): Promise<string | null>
  setPassword(service: string, account: string, password: string): Promise<void>
  deletePassword(service: string, account: string): Promise<boolean>
  findCredentials(
    service: string
  ): Promise<Array<{ account: string; password: string }>>
}

let cached: KeytarModule | null | undefined

async function loadKeytar(): Promise<KeytarModule | null> {
  if (cached !== undefined) return cached
  try {
    // Lazy import keeps web bundles from pulling native deps. The dynamic
    // module specifier is intentional: `keytar` is an OPTIONAL peer dependency
    // and ships with native bindings that may not exist in CI sandboxes,
    // browsers, or on platforms where the OS keyring is absent. We mark the
    // identifier opaque to TypeScript so the build does not fail when the
    // module is missing — at runtime the catch block downgrades us to the
    // file or memory backend via `factory.ts`.
    const moduleName = 'keytar'
    const mod = (await import(/* webpackIgnore: true */ moduleName)) as unknown as KeytarModule
    cached = mod
  } catch {
    cached = null
  }
  return cached
}

export class KeytarKeychainBackend implements KeychainBackend {
  readonly id = 'keytar' as const

  async getSecret(ref: SecretRef): Promise<string | null> {
    const keytar = await loadKeytar()
    if (!keytar) throw new Error('keytar_unavailable')
    return keytar.getPassword(ref.service, ref.account)
  }

  async setSecret(ref: SecretWrite): Promise<void> {
    const keytar = await loadKeytar()
    if (!keytar) throw new Error('keytar_unavailable')
    await keytar.setPassword(ref.service, ref.account, ref.secret)
  }

  async deleteSecret(ref: SecretRef): Promise<boolean> {
    const keytar = await loadKeytar()
    if (!keytar) throw new Error('keytar_unavailable')
    return keytar.deletePassword(ref.service, ref.account)
  }

  async findAccounts(ref: { service: string }): Promise<AccountInfo[]> {
    const keytar = await loadKeytar()
    if (!keytar) throw new Error('keytar_unavailable')
    const creds = await keytar.findCredentials(ref.service)
    return creds.map((c) => ({
      service: ref.service,
      account: c.account,
      present: true,
    }))
  }
}

export async function isKeytarAvailable(): Promise<boolean> {
  return (await loadKeytar()) !== null
}
