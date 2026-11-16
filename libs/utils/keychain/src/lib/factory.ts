import { FileKeychainBackend } from './file-backend'
import { isKeytarAvailable, KeytarKeychainBackend } from './keytar-backend'
import { MemoryKeychainBackend } from './memory-backend'
import { UnavailableKeychainBackend } from './unavailable-backend'
import type { KeychainBackend } from './types'

export interface CreateKeychainOptions {
  /** Force a specific backend (test only). */
  forceBackend?: 'keytar' | 'file' | 'memory'
  /** Override the file backend root (test only). */
  fileRoot?: string
  /** Custom env reader for tests. */
  env?: NodeJS.ProcessEnv
}

/**
 * Factory that selects the strongest available backend.
 *
 * Resolution order:
 *   1. `forceBackend` if provided.
 *   2. `LF_GATEWAY_KEY_FILE_FALLBACK=1` → file backend (with a warning).
 *   3. `keytar` if its native binding loaded successfully.
 *   4. otherwise an unavailable backend whose operations fail with an
 *      actionable error. Secrets are never written to plaintext files unless
 *      the file fallback is requested explicitly (step 2).
 *
 * The factory itself never throws; failures surface when a secret is read or
 * written.
 */
export async function createKeychain(
  options: CreateKeychainOptions = {}
): Promise<KeychainBackend> {
  const env = options.env ?? process.env

  if (options.forceBackend === 'memory') return new MemoryKeychainBackend()
  if (options.forceBackend === 'file') return new FileKeychainBackend(options.fileRoot)
  if (options.forceBackend === 'keytar') return new KeytarKeychainBackend()

  const fileFallbackRequested = env['LF_GATEWAY_KEY_FILE_FALLBACK'] === '1'
  if (fileFallbackRequested) {
    warn(
      'LF_GATEWAY_KEY_FILE_FALLBACK=1: storing signing keys on disk. ' +
        'This is insecure; do not enable outside CI.'
    )
    return new FileKeychainBackend(options.fileRoot)
  }

  if (await isKeytarAvailable()) {
    return new KeytarKeychainBackend()
  }

  warn(
    'OS keychain (keytar) is unavailable and LF_GATEWAY_KEY_FILE_FALLBACK=1 is not set; ' +
      'secret storage is disabled.'
  )
  return new UnavailableKeychainBackend()
}

function warn(msg: string): void {
  if (typeof process !== 'undefined' && process.stderr?.write) {
    process.stderr.write(`[keychain] ${msg}\n`)
  }
}
