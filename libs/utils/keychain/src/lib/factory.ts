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
 *   4. `LF_GATEWAY_REQUIRE_KEYCHAIN=1` → unavailable backend (fails closed).
 *   5. otherwise the file backend (0600 files, 0700 dir) with a one-time
 *      warning on stderr naming the storage path.
 *
 * The factory itself never throws.
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

  if (env['LF_GATEWAY_REQUIRE_KEYCHAIN'] === '1') {
    warn('OS keychain (keytar) is unavailable and LF_GATEWAY_REQUIRE_KEYCHAIN=1 is set; secret storage is disabled.')
    return new UnavailableKeychainBackend()
  }

  const fallback = new FileKeychainBackend(options.fileRoot)
  warnOnce(
    `OS keychain (keytar) is unavailable; secrets are stored in files (mode 0600) under ${fallback.root}. ` +
      'They are not protected by the OS keychain. Install the OS keychain module to remove this warning, ' +
      'or set LF_GATEWAY_REQUIRE_KEYCHAIN=1 to refuse file storage.'
  )
  return fallback
}

let warned = false
function warnOnce(msg: string): void {
  if (warned) return
  warned = true
  warn(msg)
}

function warn(msg: string): void {
  if (typeof process !== 'undefined' && process.stderr?.write) {
    process.stderr.write(`[keychain] ${msg}\n`)
  }
}
