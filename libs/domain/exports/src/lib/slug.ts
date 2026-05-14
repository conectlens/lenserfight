import { ExportPathTraversalError } from './errors'

/**
 * Filesystem-safe slug + path utilities.
 *
 * GRASP: Pure Fabrication. The export feature does not own
 * filesystem semantics; this module concentrates path sanitization so
 * every transport (cloud download, local FS, ZIP packager) applies the
 * same rules. Low Coupling: callers depend on these helpers, not on a
 * specific OS.
 */

const MAX_SLUG_LENGTH = 80
const WINDOWS_RESERVED = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
])

const FORMAT_EXTENSION: Record<string, string> = {
  markdown: 'md',
  json: 'json',
  yaml: 'yaml',
}

/**
 * Sanitize an arbitrary input string into a kebab-case slug. Idempotent.
 *
 * Rules:
 * - lowercase
 * - keep [a-z0-9]; collapse anything else to a single '-'
 * - trim leading/trailing dashes and dots
 * - reject empty results
 * - cap to MAX_SLUG_LENGTH chars
 * - reject Windows-reserved bare names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
 */
export function sanitizeSlug(raw: string): string {
  if (typeof raw !== 'string') {
    throw new TypeError('sanitizeSlug: expected string')
  }
  const lowered = raw.normalize('NFKD').toLowerCase()
  // strip non-ascii first (defence against homoglyph-style traversal)
  // eslint-disable-next-line no-control-regex
  const ascii = lowered.replace(/[^\x20-\x7e]/g, '-')
  const collapsed = ascii.replace(/[^a-z0-9]+/g, '-')
  const trimmed = collapsed.replace(/^[-.]+|[-.]+$/g, '')
  if (trimmed.length === 0) {
    throw new TypeError('sanitizeSlug: result is empty after sanitization')
  }
  const capped = trimmed.slice(0, MAX_SLUG_LENGTH)
  if (WINDOWS_RESERVED.has(capped.toUpperCase())) {
    return `${capped}-file`
  }
  return capped
}

export function isoBasicTimestamp(date: Date = new Date()): string {
  // 2026-05-14T193045Z (basic ISO-8601, safe for filenames)
  const iso = date.toISOString()
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

const BASE32 = 'abcdefghijklmnopqrstuvwxyz234567'

/**
 * 6-char base32 short id. Uses WebCrypto when available, falling back
 * to Math.random ONLY for non-security-critical filename uniqueness.
 */
export function shortId(rand: () => number = Math.random): string {
  const bytes = new Uint8Array(6)
  const subtle = globalThis.crypto
  if (subtle && typeof subtle.getRandomValues === 'function') {
    subtle.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(rand() * 256)
  }
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += BASE32[bytes[i] % 32]
  }
  return out.slice(0, 6)
}

export function formatExtension(format: string): string {
  const ext = FORMAT_EXTENSION[format]
  if (!ext) throw new TypeError(`formatExtension: unsupported format "${format}"`)
  return ext
}

export interface ExportFilenameInput {
  slug: string
  format: string
  date?: Date
}

/**
 * Build a collision-safe export filename:
 *   <slug>--<ISO-basic-UTC>--<6char-base32>.<ext>
 */
export function buildExportFilename({ slug, format, date }: ExportFilenameInput): string {
  return `${sanitizeSlug(slug)}--${isoBasicTimestamp(date)}--${shortId()}.${formatExtension(format)}`
}

/**
 * Resolve a relative path against a workspace root, refusing any path
 * that escapes the root. Pure-string variant (no OS calls) so it can run
 * isomorphically. Callers pass absolute paths already normalized.
 *
 * The check uses string prefix logic after normalizing `..` segments.
 * Use this BEFORE handing the path to a filesystem adapter.
 */
export function safeJoinWithinRoot(root: string, relative: string): string {
  if (relative.includes('\0')) {
    throw new ExportPathTraversalError(relative)
  }
  const parts = relative.split(/[/\\]+/)
  const stack: string[] = []
  for (const part of parts) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (stack.length === 0) throw new ExportPathTraversalError(relative)
      stack.pop()
      continue
    }
    stack.push(part)
  }
  const normalizedRel = stack.join('/')
  if (normalizedRel.length === 0) {
    throw new ExportPathTraversalError(relative)
  }
  const normalizedRoot = root.replace(/[/\\]+$/, '')
  const full = `${normalizedRoot}/${normalizedRel}`
  if (!full.startsWith(`${normalizedRoot}/`)) {
    throw new ExportPathTraversalError(full)
  }
  return full
}
