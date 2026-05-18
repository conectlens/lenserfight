/**
 * File-backed local BYOK key store.
 *
 * Information Expert — owns the file/envelope CRUD lifecycle. Composes the
 * cipher (Pure Fabrication), path utilities (Pure Fabrication), passphrase
 * provider (Pure Fabrication), and audit log (Pure Fabrication). Higher
 * layers (gateway HTTP handlers, CLI commands) program against
 * `LocalKeyStorePort` — never against this class directly — so the wire
 * boundary can swap to `LocalKeysGatewayClient` without rewriting consumers.
 */

import { randomBytes } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'

import { appendAuditEvent } from './audit'
import { decryptEnvelope, encryptEnvelope } from './cipher'
import { parseEnvelopeJson, serializeEnvelope } from './envelope'
import {
  atomicWriteFile,
  ensureKeysDir,
  getKeyFilePath,
  getKeysDir,
  listKeyFiles,
  safeUnlink,
  validateKeyId,
  validateProvider,
} from './paths'
import { defaultPassphraseProvider, PassphraseProvider } from './passphrase'
import { LocalKeyStoreError } from './ports'

import type { KeyEnvelope } from './envelope'
import type {
  AddLocalKeyInput,
  DoctorReport,
  LocalKeyMetadata,
  LocalKeyStorePort,
  UpdateLocalKeyInput,
} from './ports'

export interface LocalKeyStoreOptions {
  passphraseProvider?: PassphraseProvider
  env?: NodeJS.ProcessEnv
  idGenerator?: () => string
}

/** Generate a URL-safe key id that matches KEY_ID_PATTERN. */
export function generateKeyId(): string {
  // 24 bytes → 32-char base64url, fits inside [20, 40].
  return randomBytes(24).toString('base64url')
}

export class LocalKeyStore implements LocalKeyStorePort {
  private readonly passphrases: PassphraseProvider
  private readonly env: NodeJS.ProcessEnv
  private readonly idGenerator: () => string

  constructor(opts: LocalKeyStoreOptions = {}) {
    this.passphrases = opts.passphraseProvider ?? defaultPassphraseProvider
    this.env = opts.env ?? process.env
    this.idGenerator = opts.idGenerator ?? generateKeyId
  }

  async list(): Promise<LocalKeyMetadata[]> {
    const files = await listKeyFiles(this.env)
    const out: LocalKeyMetadata[] = []
    for (const file of files) {
      try {
        const raw = await readFile(file, 'utf-8')
        const env = parseEnvelopeJson(raw)
        out.push(env.meta)
      } catch {
        // Skip unreadable / non-envelope files. doctor() surfaces them.
      }
    }
    out.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    void appendAuditEvent({ kind: 'list', ok: true }, this.env)
    return out
  }

  async add(input: AddLocalKeyInput): Promise<LocalKeyMetadata> {
    validateProvider(input.provider)
    if (typeof input.rawKey !== 'string' || input.rawKey.length === 0) {
      throw new LocalKeyStoreError('invalid_provider', 'rawKey must be a non-empty string')
    }
    if (typeof input.label !== 'string' || input.label.length === 0 || input.label.length > 64) {
      throw new LocalKeyStoreError('invalid_provider', 'label must be 1–64 characters')
    }
    const passphrase = await this.passphrases.get()
    await ensureKeysDir(this.env)

    const id = this.idGenerator()
    validateKeyId(id)
    const meta: LocalKeyMetadata = {
      id,
      provider: input.provider,
      label: input.label,
      createdAt: new Date().toISOString(),
    }
    const envelope = encryptEnvelope(passphrase, input.rawKey, meta)
    const path = getKeyFilePath(id, this.env)
    try {
      await atomicWriteFile(path, serializeEnvelope(envelope), { exclusive: true })
    } catch (err) {
      await appendAuditEvent(
        {
          kind: 'add',
          keyId: id,
          ok: false,
          reason: err instanceof LocalKeyStoreError ? err.code : 'io_error',
        },
        this.env
      )
      throw err
    }
    await appendAuditEvent({ kind: 'add', keyId: id, ok: true }, this.env)
    return meta
  }

  async update(input: UpdateLocalKeyInput): Promise<LocalKeyMetadata> {
    validateKeyId(input.id)
    if (input.rawKey === undefined && input.label === undefined) {
      throw new LocalKeyStoreError('invalid_key_id', 'update() requires rawKey or label')
    }
    if (input.label !== undefined && (input.label.length === 0 || input.label.length > 64)) {
      throw new LocalKeyStoreError('invalid_provider', 'label must be 1–64 characters')
    }
    const passphrase = await this.passphrases.get()
    const path = getKeyFilePath(input.id, this.env)
    const existing = await this.readEnvelope(path)

    const newPlaintext = input.rawKey ?? decryptEnvelope(passphrase, existing)
    const meta: LocalKeyMetadata = {
      ...existing.meta,
      label: input.label ?? existing.meta.label,
    }
    const fresh = encryptEnvelope(passphrase, newPlaintext, meta)
    // Atomic replace: write to temp then rename over the existing file.
    // We unlink first because atomicWriteFile() with `exclusive:false`
    // already does temp+rename, but rename-over-existing is what we want.
    await atomicWriteFileReplace(path, serializeEnvelope(fresh))
    await appendAuditEvent({ kind: 'update', keyId: input.id, ok: true }, this.env)
    return meta
  }

  async remove(id: string): Promise<void> {
    validateKeyId(id)
    const path = getKeyFilePath(id, this.env)
    await safeUnlink(path)
    await appendAuditEvent({ kind: 'remove', keyId: id, ok: true }, this.env)
  }

  async resolve(id: string): Promise<string> {
    validateKeyId(id)
    const passphrase = await this.passphrases.get()
    const path = getKeyFilePath(id, this.env)
    const env = await this.readEnvelope(path)
    let plaintext: string
    try {
      plaintext = decryptEnvelope(passphrase, env)
    } catch (err) {
      await appendAuditEvent(
        {
          kind: 'resolve',
          keyId: id,
          ok: false,
          reason: err instanceof LocalKeyStoreError ? err.code : 'decryption_failed',
        },
        this.env
      )
      throw err
    }
    await appendAuditEvent({ kind: 'resolve', keyId: id, ok: true }, this.env)
    return plaintext
  }

  /** Diagnostics for `lf keys doctor` and the gateway health endpoint. */
  async doctor(): Promise<DoctorReport> {
    const dir = getKeysDir(this.env)
    const report: DoctorReport = {
      passphrasePresent: await this.passphrases.isConfigured(),
      keysDirExists: false,
      keysDirMode: null,
      keysDirIsSymlink: false,
      fileIssues: [],
      auditLogWritable: true,
    }
    try {
      const s = await stat(dir)
      report.keysDirExists = true
      report.keysDirMode = s.mode & 0o777
    } catch {
      return report
    }
    for (const file of await listKeyFiles(this.env)) {
      try {
        const s = await stat(file)
        const mode = s.mode & 0o777
        if (mode & 0o044) report.fileIssues.push({ path: file, issue: 'world_readable', mode })
        if (mode & 0o022) report.fileIssues.push({ path: file, issue: 'world_writable', mode })
        if ((mode & 0o040) && !(mode & 0o044)) {
          report.fileIssues.push({ path: file, issue: 'group_readable', mode })
        }
        try {
          const raw = await readFile(file, 'utf-8')
          parseEnvelopeJson(raw)
        } catch {
          report.fileIssues.push({ path: file, issue: 'corrupt_envelope' })
        }
      } catch {
        report.fileIssues.push({ path: file, issue: 'unreadable' })
      }
    }
    return report
  }

  private async readEnvelope(path: string): Promise<KeyEnvelope> {
    try {
      const raw = await readFile(path, 'utf-8')
      return parseEnvelopeJson(raw)
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code
      if (code === 'ENOENT') {
        throw new LocalKeyStoreError('key_not_found', `No such key: ${path}`)
      }
      if (err instanceof LocalKeyStoreError) throw err
      throw new LocalKeyStoreError('io_error', `read failed for ${path}: ${(err as Error).message}`)
    }
  }
}

async function atomicWriteFileReplace(path: string, contents: string): Promise<void> {
  // For updates we accept overwrite. atomicWriteFile() with exclusive:false
  // writes to a tmp file and rename(2)s on top — atomic on POSIX.
  await atomicWriteFile(path + '.next', contents, { exclusive: true })
  // Now rename .next over the existing file.
  const { rename } = await import('node:fs/promises')
  await rename(path + '.next', path)
}
