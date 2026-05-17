/**
 * LenserFight CLI update-check service.
 *
 * Design goals:
 * - Non-blocking: check fires in the background, never delays commands.
 * - Cached: one network call per 24 h, stored in ~/.lenserfight/update-check.json.
 * - Offline-safe: any fetch failure is silently swallowed.
 * - Channel-aware: stable users only see stable releases; beta/rc users see
 *   releases in their channel or newer stable ones.
 * - Skippable: LF_NO_UPDATE_CHECK=1 or --local mode suppresses all checks.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const CACHE_FILE = join(homedir(), '.lenserfight', 'update-check.json')
const REGISTRY_URL = 'https://registry.npmjs.org/@lenserfight/cli/latest'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export type ReleaseChannel = 'stable' | 'beta' | 'rc' | 'nightly' | 'dev'

export interface UpdateCheckResult {
  current: string
  latest: string
  hasUpdate: boolean
  channel: ReleaseChannel
  checkedAt: number
}

interface CacheEntry {
  latest: string
  checkedAt: number
}

// ── Semver helpers (no external deps) ────────────────────────────────────────

function parseSemver(v: string): [number, number, number, string] {
  const clean = v.replace(/^v/, '')
  const [core, pre = ''] = clean.split('-', 2)
  const parts = (core ?? '').split('.').map(Number)
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, pre]
}

/** Returns true when `candidate` is strictly newer than `installed`. */
export function isNewer(installed: string, candidate: string): boolean {
  if (installed === candidate) return false
  const [iMaj, iMin, iPat, iPre] = parseSemver(installed)
  const [cMaj, cMin, cPat, cPre] = parseSemver(candidate)
  if (cMaj !== iMaj) return cMaj > iMaj
  if (cMin !== iMin) return cMin > iMin
  if (cPat !== iPat) return cPat > iPat
  // Pre-release is "lower" than stable: 1.0.0-beta < 1.0.0
  if (iPre && !cPre) return true
  if (!iPre && cPre) return false
  return cPre > iPre
}

export function detectChannel(version: string): ReleaseChannel {
  if (version.includes('-nightly')) return 'nightly'
  if (version.includes('-beta')) return 'beta'
  if (version.includes('-rc')) return 'rc'
  if (version.includes('-')) return 'dev' // local dev or unknown pre-release
  return 'stable'
}

// ── Cache ─────────────────────────────────────────────────────────────────────

function readCache(): CacheEntry | null {
  try {
    const raw = readFileSync(CACHE_FILE, 'utf-8')
    const entry = JSON.parse(raw) as CacheEntry
    if (typeof entry.latest === 'string' && typeof entry.checkedAt === 'number') {
      return entry
    }
  } catch {
    // missing or malformed — treat as empty
  }
  return null
}

function writeCache(entry: CacheEntry): void {
  try {
    const dir = join(homedir(), '.lenserfight')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(CACHE_FILE, JSON.stringify(entry, null, 2) + '\n', 'utf-8')
  } catch {
    // best-effort; never surface cache errors
  }
}

// ── Network ───────────────────────────────────────────────────────────────────

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const res = await fetch(REGISTRY_URL, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const body = (await res.json()) as { version?: string }
    return typeof body.version === 'string' ? body.version : null
  } catch {
    return null
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Check whether a newer stable release is available for the given version.
 *
 * The function:
 * 1. Returns immediately from cache if the cached entry is <24 h old.
 * 2. Fetches from the npm registry and updates the cache otherwise.
 * 3. Never throws — all errors return `null`.
 *
 * Callers should fire-and-forget via `checkForUpdate(...).then(printUpdateHint)`.
 */
export async function checkForUpdate(
  currentVersion: string,
  opts: { force?: boolean } = {},
): Promise<UpdateCheckResult | null> {
  // Skip for dev builds and local mode
  if (
    process.env['LF_NO_UPDATE_CHECK'] === '1' ||
    process.env['LF_LOCAL'] === '1'
  ) {
    return null
  }

  const channel = detectChannel(currentVersion)

  // Dev snapshots: skip unless explicitly forced
  if (channel === 'dev' && !opts.force) return null

  // Try cache first
  if (!opts.force) {
    const cached = readCache()
    if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
      return {
        current: currentVersion,
        latest: cached.latest,
        hasUpdate: isNewer(currentVersion, cached.latest),
        channel,
        checkedAt: cached.checkedAt,
      }
    }
  }

  // Fetch from registry
  const latest = await fetchLatestVersion()
  if (!latest) return null

  const now = Date.now()
  writeCache({ latest, checkedAt: now })

  return {
    current: currentVersion,
    latest,
    hasUpdate: isNewer(currentVersion, latest),
    channel,
    checkedAt: now,
  }
}

/**
 * Invalidate the update-check cache (e.g. after a successful update).
 */
export function invalidateUpdateCache(): void {
  try {
    const entry: CacheEntry = { latest: '', checkedAt: 0 }
    writeCache(entry)
  } catch {
    // best-effort
  }
}
