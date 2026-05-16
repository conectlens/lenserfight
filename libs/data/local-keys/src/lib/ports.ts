/**
 * Public contracts for the local-keys store.
 *
 * Two implementations satisfy `LocalKeyStorePort`:
 *   - `LocalKeyStore`        (Node-only, in `./store.ts`)         — direct fs
 *   - `LocalKeysGatewayClient` (browser-safe, in `./browser/`)    — loopback HTTP
 *
 * Consumers (CLI, gateway handlers, web hooks) program against the port, never
 * the concrete class. This is straight Dependency Inversion + Polymorphism.
 *
 * INVARIANTS
 *   - Plaintext key material is only ever returned from `resolve()`, and
 *     callers must zero / drop the reference as soon as the upstream call
 *     completes. Implementations MUST NOT cache plaintext beyond a single
 *     resolve() call.
 *   - `list()` returns metadata only. No ciphertext, no IV, no plaintext.
 *   - Implementations MUST raise `LocalKeyStoreError` with a `code` field —
 *     never a generic `Error` — so callers can render the correct UX.
 */

export interface LocalKeyMetadata {
  id: string
  provider: string
  label: string
  createdAt: string
}

export interface AddLocalKeyInput {
  provider: string
  label: string
  /** Plaintext provider key. Caller is responsible for zeroing after this call. */
  rawKey: string
}

export interface UpdateLocalKeyInput {
  id: string
  /** Optional new label. Pass undefined to keep the existing label. */
  label?: string
  /** Optional new plaintext key. Pass undefined to keep the existing ciphertext. */
  rawKey?: string
}

export type LocalKeyStoreErrorCode =
  | 'passphrase_missing'
  | 'passphrase_invalid'
  | 'decryption_failed'
  | 'corrupt_envelope'
  | 'invalid_key_id'
  | 'invalid_provider'
  | 'key_not_found'
  | 'duplicate_key'
  | 'io_error'
  | 'permission_error'
  | 'symlink_refused'
  | 'gateway_not_paired'
  | 'gateway_unreachable'
  | 'gateway_forbidden'
  | 'gateway_rate_limited'

export class LocalKeyStoreError extends Error {
  readonly code: LocalKeyStoreErrorCode
  constructor(code: LocalKeyStoreErrorCode, message: string) {
    super(message)
    this.name = 'LocalKeyStoreError'
    this.code = code
  }
}

export interface LocalKeyStorePort {
  list(): Promise<LocalKeyMetadata[]>
  add(input: AddLocalKeyInput): Promise<LocalKeyMetadata>
  update(input: UpdateLocalKeyInput): Promise<LocalKeyMetadata>
  remove(id: string): Promise<void>
  /**
   * Decrypts and returns the plaintext key for a single use.
   *
   * Callers MUST treat the returned string as ephemeral — pass it directly to
   * the upstream request and drop the reference. Do NOT log, persist, or
   * cache it.
   */
  resolve(id: string): Promise<string>
}

export interface DoctorReport {
  passphrasePresent: boolean
  keysDirExists: boolean
  keysDirMode: number | null
  keysDirIsSymlink: boolean
  fileIssues: Array<{
    path: string
    issue:
      | 'world_readable'
      | 'world_writable'
      | 'group_readable'
      | 'is_symlink'
      | 'corrupt_envelope'
      | 'unreadable'
    mode?: number
  }>
  auditLogWritable: boolean
}
