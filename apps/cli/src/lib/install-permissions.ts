/**
 * Pre-flight check for `lf update`.
 *
 * A globally installed CLI is often not writable by the account running it —
 * on a shared machine the package belongs to whoever installed it, and a
 * Homebrew-managed prefix (`/opt/homebrew/lib/node_modules`) is owned by the
 * account that installed Homebrew. npm replaces a package by renaming its
 * directory, so it needs write access on the *parent* and on the bin directory
 * holding the symlink; without it the install dies with a wall of EACCES
 * output that ends in advice to run the very command that just failed.
 *
 * Detecting this first lets `lf update` skip the doomed install and say
 * something actionable instead.
 */

import { accessSync, constants, realpathSync, statSync } from 'node:fs'
import { dirname } from 'node:path'

export interface InstallPermissionBlock {
  /** The directory npm cannot write to. */
  dir: string
  /** Owner of that directory, when the platform reports uids. */
  ownerUid: number | null
  /** The account running this process, when the platform reports uids. */
  currentUid: number | null
}

/**
 * The directory npm must write into to replace an installed package: the
 * scope directory for a scoped package, otherwise `node_modules` itself.
 * Returns null when the entry path is not inside a `node_modules` tree
 * (a source checkout, a bundled binary), where this check does not apply.
 */
export function installParentDirOf(entryPath: string): string | null {
  const parts = entryPath.split(/[\\/]/)
  const index = parts.lastIndexOf('node_modules')
  if (index === -1) return null
  const scoped = parts[index + 1]?.startsWith('@') ? 1 : 0
  return parts.slice(0, index + 1 + scoped).join(entryPath.includes('\\') ? '\\' : '/')
}

function isWritable(dir: string): boolean {
  try {
    accessSync(dir, constants.W_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Returns details of the first directory blocking an in-place update, or null
 * when the update can proceed. Never throws: an undeterminable layout falls
 * through to null so the install still gets attempted.
 */
export function findInstallPermissionBlock(entryPath: string | undefined): InstallPermissionBlock | null {
  if (!entryPath) return null

  // argv[1] keeps the symlink path (`/opt/homebrew/bin/lf`), so resolve it to
  // reach the real package.
  let real = entryPath
  try {
    real = realpathSync(entryPath)
  } catch {
    // unresolvable — fall through and judge on the unresolved path
  }

  // Outside a node_modules tree there is nothing to replace in place: a source
  // checkout or a bundled binary. Skip the check rather than reporting a
  // meaningless directory.
  const packageParent = installParentDirOf(real)
  if (!packageParent) return null

  // The directory npm's rename actually hits, and the one named in its error.
  const candidates = [packageParent]
  // When argv[1] was a bin shim, npm rewrites that symlink too.
  if (real !== entryPath) {
    const binDir = dirname(entryPath)
    if (binDir && binDir !== entryPath) candidates.push(binDir)
  }

  for (const dir of candidates) {
    if (isWritable(dir)) continue
    let ownerUid: number | null = null
    try {
      ownerUid = statSync(dir).uid
    } catch {
      // stat can fail on an unreadable parent; the block still stands
    }
    return {
      dir,
      ownerUid,
      currentUid: typeof process.getuid === 'function' ? process.getuid() : null,
    }
  }
  return null
}

/**
 * Actionable guidance for a blocked update. Deliberately does not tell the user
 * to re-run the same install command, and does not recommend plain `sudo npm`
 * first — under a Homebrew prefix that leaves root-owned files that break later
 * `brew` operations.
 */
export function formatPermissionGuidance(block: InstallPermissionBlock, targetSpec: string): string {
  const lines: string[] = [
    '',
    '  lf is installed in a directory your account cannot write to, so npm cannot',
    '  replace it. Re-running the same install will fail the same way.',
    '',
    `    install dir   ${block.dir}`,
  ]
  if (block.ownerUid !== null) lines.push(`    owned by      uid ${block.ownerUid}`)
  if (block.currentUid !== null) lines.push(`    you are       uid ${block.currentUid}`)
  lines.push(
    '',
    '  Pick whichever fits:',
    '',
    block.ownerUid !== null && block.ownerUid !== block.currentUid
      ? `  1. Run the update from the account that owns the install (uid ${block.ownerUid}).`
      : '  1. Run the update from the account that owns the install.',
    '',
    '  2. Take ownership of just this package, then re-run `lf update`:',
    `       sudo chown -R "$(id -un)" "${block.dir}"`,
    '',
    '  3. Move to a per-user global prefix so updates never need elevation:',
    '       npm config set prefix ~/.npm-global',
    `       npm install -g ${targetSpec}`,
    '       # then put ~/.npm-global/bin ahead of the old prefix on your PATH',
    '',
    '  `sudo npm install -g` works too, but under a Homebrew-managed prefix it',
    '  leaves root-owned files behind that can break later `brew` commands.',
    '',
  )
  return lines.join('\n') + '\n'
}
