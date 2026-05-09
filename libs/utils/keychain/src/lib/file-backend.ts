import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import type { AccountInfo, KeychainBackend, SecretRef, SecretWrite } from './types'

/**
 * File-system fallback backend for environments where the OS keychain is
 * unavailable (CI, headless containers). Storage is `~/.lenserfight/gateway/
 * keys/<service>__<account>` with mode `0600` and parent directory `0700`.
 *
 * MUST NOT be enabled in production developer environments. The factory
 * function only constructs this backend when `LF_GATEWAY_KEY_FILE_FALLBACK=1`.
 */
export class FileKeychainBackend implements KeychainBackend {
  readonly id = 'file' as const

  constructor(private readonly rootDir = defaultRoot()) {}

  async getSecret(ref: SecretRef): Promise<string | null> {
    const file = this.fileFor(ref)
    try {
      return await readFile(file, 'utf-8')
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw err
    }
  }

  async setSecret(ref: SecretWrite): Promise<void> {
    await mkdir(this.rootDir, { recursive: true, mode: 0o700 })
    const file = this.fileFor(ref)
    await writeFile(file, ref.secret, { mode: 0o600 })
  }

  async deleteSecret(ref: SecretRef): Promise<boolean> {
    const file = this.fileFor(ref)
    try {
      await unlink(file)
      return true
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return false
      throw err
    }
  }

  async findAccounts(ref: { service: string }): Promise<AccountInfo[]> {
    let entries: string[] = []
    try {
      entries = await readdir(this.rootDir)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw err
    }
    const prefix = `${encodeKey(ref.service)}__`
    return entries
      .filter((name) => name.startsWith(prefix))
      .map((name) => ({
        service: ref.service,
        account: decodeKey(name.slice(prefix.length)),
        present: true,
      }))
  }

  private fileFor(ref: SecretRef): string {
    return path.join(
      this.rootDir,
      `${encodeKey(ref.service)}__${encodeKey(ref.account)}`
    )
  }
}

function defaultRoot(): string {
  return path.join(os.homedir(), '.lenserfight', 'gateway', 'keys')
}

function encodeKey(value: string): string {
  return Buffer.from(value, 'utf-8').toString('base64url')
}

function decodeKey(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf-8')
}
