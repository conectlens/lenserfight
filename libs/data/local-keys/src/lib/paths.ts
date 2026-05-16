/**
 * Filesystem path resolution and hardening for the local key store.
 *
 * Pure Fabrication — owns directory layout, file naming, and permission
 * enforcement. Knows nothing about crypto or HTTP.
 *
 * Layout under `~/.lenserfight/keys/` (override via env `LENSERFIGHT_KEYS_DIR`):
 *
 *   keys/
 *   ├── <id>.json     ← one per key, mode 0600
 *   └── audit.log     ← append-only, mode 0600
 *
 * Parent directory mode is 0700.
 */

import { constants as fsConstants, openSync, closeSync, fsyncSync, writeSync } from 'node:fs'
import { chmod, lstat, mkdir, rename, unlink, readdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve as resolvePath } from 'node:path'

import { LocalKeyStoreError } from './ports'

export const KEY_ID_PATTERN = /^[A-Za-z0-9_-]{20,40}$/
export const ENV_KEYS_DIR = 'LENSERFIGHT_KEYS_DIR'
export const ENV_RUNTIME_DIR = 'LENSERFIGHT_RUNTIME_DIR'

const DIR_MODE = 0o700
const FILE_MODE = 0o600

export function getLenserfightRuntimeDir(env: NodeJS.ProcessEnv = process.env): string {
  return env[ENV_RUNTIME_DIR] || resolvePath(homedir(), '.lenserfight')
}

export function getKeysDir(env: NodeJS.ProcessEnv = process.env): string {
  return env[ENV_KEYS_DIR] || resolvePath(getLenserfightRuntimeDir(env), 'keys')
}

export function getKeyFilePath(id: string, env?: NodeJS.ProcessEnv): string {
  validateKeyId(id)
  return join(getKeysDir(env), `${id}.json`)
}

export function getAuditLogPath(env?: NodeJS.ProcessEnv): string {
  return join(getKeysDir(env), 'audit.log')
}

export function validateKeyId(id: string): void {
  if (typeof id !== 'string' || !KEY_ID_PATTERN.test(id)) {
    throw new LocalKeyStoreError(
      'invalid_key_id',
      'Key id must be 20–40 chars of [A-Za-z0-9_-]'
    )
  }
}

export function validateProvider(provider: string): void {
  if (typeof provider !== 'string' || !/^[a-z][a-z0-9_-]{1,31}$/.test(provider)) {
    throw new LocalKeyStoreError(
      'invalid_provider',
      'Provider must be 2–32 chars of [a-z0-9_-] and start with a letter'
    )
  }
}

export async function ensureKeysDir(env?: NodeJS.ProcessEnv): Promise<void> {
  const dir = getKeysDir(env)
  await mkdir(dir, { recursive: true, mode: DIR_MODE })
  // Defensive chmod in case the dir pre-existed with looser perms.
  try {
    await chmod(dir, DIR_MODE)
  } catch (err) {
    if (process.platform !== 'win32') {
      throw new LocalKeyStoreError('permission_error', `Cannot enforce 0700 on ${dir}: ${(err as Error).message}`)
    }
  }
}

/**
 * Refuse to follow symlinks. lstat → if symlink, refuse. This guards against
 * a same-user attacker swapping a key file for a symlink that points at e.g.
 * `~/.ssh/id_rsa`, which the gateway would then try to interpret as an
 * envelope (and on rotate, would overwrite).
 */
export async function assertNotSymlink(path: string): Promise<void> {
  try {
    const s = await lstat(path)
    if (s.isSymbolicLink()) {
      throw new LocalKeyStoreError('symlink_refused', `Refusing to follow symlink at ${path}`)
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return
    if (err instanceof LocalKeyStoreError) throw err
    throw new LocalKeyStoreError('io_error', `lstat failed for ${path}: ${(err as Error).message}`)
  }
}

/**
 * Atomic write via temp + rename, refusing to overwrite when `exclusive` is set.
 * Honors O_NOFOLLOW so a malicious symlink swap during the rename is rejected.
 */
export async function atomicWriteFile(
  path: string,
  contents: string,
  options: { exclusive?: boolean } = {}
): Promise<void> {
  await assertNotSymlink(path)
  if (options.exclusive) {
    // Bail before doing the heavy write if the target already exists.
    try {
      await stat(path)
      throw new LocalKeyStoreError('duplicate_key', `Refusing to overwrite ${path}`)
    } catch (err) {
      if (err instanceof LocalKeyStoreError) throw err
      const code = (err as NodeJS.ErrnoException).code
      if (code !== 'ENOENT') {
        throw new LocalKeyStoreError('io_error', `stat failed for ${path}: ${(err as Error).message}`)
      }
    }
  }
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`
  let fd: number | null = null
  try {
    fd = openSync(tmp, fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_NOFOLLOW, FILE_MODE)
    writeSync(fd, contents)
    fsyncSync(fd)
  } finally {
    if (fd !== null) closeSync(fd)
  }
  try {
    await rename(tmp, path)
  } catch (err) {
    await unlink(tmp).catch(() => undefined)
    throw new LocalKeyStoreError('io_error', `rename failed: ${(err as Error).message}`)
  }
  try {
    await chmod(path, FILE_MODE)
  } catch {
    // Best-effort; the O_CREAT mode is the primary guarantee.
  }
}

export async function safeUnlink(path: string): Promise<void> {
  await assertNotSymlink(path)
  try {
    await unlink(path)
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') {
      throw new LocalKeyStoreError('key_not_found', `No such key file: ${path}`)
    }
    throw new LocalKeyStoreError('io_error', `unlink failed for ${path}: ${(err as Error).message}`)
  }
}

export async function listKeyFiles(env?: NodeJS.ProcessEnv): Promise<string[]> {
  const dir = getKeysDir(env)
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries
      .filter((e) => e.isFile() && e.name.endsWith('.json') && e.name !== 'audit.log')
      .map((e) => join(dir, e.name))
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return []
    throw new LocalKeyStoreError('io_error', `readdir failed for ${dir}: ${(err as Error).message}`)
  }
}

export { DIR_MODE as KEYS_DIR_MODE, FILE_MODE as KEYS_FILE_MODE }
