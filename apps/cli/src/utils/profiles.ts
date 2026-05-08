import { promises as fsp } from 'node:fs'
import { existsSync, mkdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// ─── Profile shape ──────────────────────────────────────────────────────────
//
// Each profile is a JSON file under `~/.lenserfight/profiles/<name>.json` that
// holds the credentials and defaults needed to point the CLI at a specific
// Supabase backend. The file is written with mode 0o600 because it contains
// access tokens. An optional `default_workflow_id` is kept so commands like
// `lf execution wait` can pick a sensible default without rummaging through
// project config.

export interface LenserfightProfile {
  name: string
  supabase_url: string
  supabase_anon_key: string
  access_token?: string
  refresh_token?: string
  default_workflow_id?: string
  created_at: string
}

// ─── Path helpers ────────────────────────────────────────────────────────────

export function getProfilesDir(): string {
  const dir = path.join(os.homedir(), '.lenserfight', 'profiles')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

function getProfilePath(name: string): string {
  return path.join(getProfilesDir(), `${name}.json`)
}

function getActivePath(): string {
  return path.join(getProfilesDir(), '.active')
}

// ─── Profile CRUD ────────────────────────────────────────────────────────────

export async function listProfiles(): Promise<string[]> {
  const dir = getProfilesDir()
  const entries = await fsp.readdir(dir)
  const names = entries
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -'.json'.length))
  names.sort()
  return names
}

export async function loadProfile(name: string): Promise<LenserfightProfile> {
  const filePath = getProfilePath(name)
  if (!existsSync(filePath)) {
    throw new Error(`Profile "${name}" not found at ${filePath}.`)
  }
  const raw = await fsp.readFile(filePath, 'utf-8')
  return JSON.parse(raw) as LenserfightProfile
}

export async function saveProfile(
  name: string,
  data: LenserfightProfile,
): Promise<void> {
  // Ensure directory exists (also touches mkdirSync side-effect).
  getProfilesDir()
  const filePath = getProfilePath(name)
  await fsp.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', {
    mode: 0o600,
  })
  // chmod a second time in case the umask altered the create mode.
  try {
    await fsp.chmod(filePath, 0o600)
  } catch {
    // Best-effort on platforms without POSIX perms (e.g. Windows).
  }
}

export async function deleteProfile(
  name: string,
  options: { force?: boolean } = {},
): Promise<void> {
  const filePath = getProfilePath(name)
  if (!existsSync(filePath)) {
    throw new Error(`Profile "${name}" not found.`)
  }

  // Refuse to delete the only remaining profile when it's the active one,
  // unless `--force` is passed: leaves the user with no working profile.
  const all = await listProfiles()
  const active = await getActiveProfileName()
  if (!options.force && active === name && all.length <= 1) {
    throw new Error(
      `Cannot delete the active profile "${name}" — it is the only profile. Pass --force to override.`,
    )
  }

  await fsp.unlink(filePath)
}

// ─── Active profile resolver ─────────────────────────────────────────────────

export async function getActiveProfileName(): Promise<string> {
  // Precedence: .active file → LF_PROFILE env → 'default'
  const activeFile = getActivePath()
  if (existsSync(activeFile)) {
    try {
      const raw = (await fsp.readFile(activeFile, 'utf-8')).trim()
      if (raw) return raw
    } catch {
      /* ignore — fall through */
    }
  }
  if (process.env['LF_PROFILE']) return process.env['LF_PROFILE'] as string
  return 'default'
}

export async function setActiveProfileName(name: string): Promise<void> {
  // Verify the profile actually exists before pointing .active at it.
  const filePath = getProfilePath(name)
  if (!existsSync(filePath)) {
    throw new Error(`Profile "${name}" does not exist; create it first.`)
  }
  await fsp.writeFile(getActivePath(), name + '\n', { mode: 0o600 })
}

// ─── Resolver used by api.ts ─────────────────────────────────────────────────
//
// Returns the active profile (if one is configured) or null when no profile
// system is in use. api.ts falls back to the legacy env-based config in that
// case, so existing single-credential setups keep working unchanged.

export async function tryLoadActiveProfile(): Promise<LenserfightProfile | null> {
  try {
    const name = await getActiveProfileName()
    const filePath = getProfilePath(name)
    if (!existsSync(filePath)) return null
    return await loadProfile(name)
  } catch {
    return null
  }
}
