import { FileKeychainBackend } from './file-backend'
import { isKeytarAvailable, KeytarKeychainBackend } from './keytar-backend'
import { MemoryKeychainBackend } from './memory-backend'
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
 *   4. file backend (with a warning).
 *
 * The factory NEVER throws. If even the file backend fails to construct,
 * a memory backend is returned and a warning is logged.
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
    'OS keychain (keytar) is unavailable. Falling back to file storage. ' +
      'Install libsecret-tools (Linux) / configure Keychain Access (macOS) ' +
      'to remove this warning.'
  )
  return new FileKeychainBackend(options.fileRoot)
}

function warn(msg: string): void {
  if (typeof process !== 'undefined' && process.stderr?.write) {
    process.stderr.write(`[keychain] ${msg}\n`)
  }
}
