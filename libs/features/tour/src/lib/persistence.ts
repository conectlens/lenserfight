import { preferencesService } from '@lenserfight/data/repositories'

/**
 * Seen-state persistence for guided tours.
 * localStorage is the always-available mirror; when authenticated the seen ids
 * are also merged server-side via the preferences service.
 */

const SEEN_KEY = 'lf_tours_seen'
const OPTED_OUT_KEY = 'lf_tours_opted_out'

export function readSeenTourIds(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === 'string')
  } catch {
    return []
  }
}

export function writeSeenTourIds(ids: string[]): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(ids))
  } catch {
    // ignore storage failures (private mode, quota, SSR)
  }
}

/**
 * Fetches seen tour ids from the server. Returns [] when unauthenticated or on
 * any failure — local seen state remains the source of truth in that case.
 */
export async function fetchRemoteSeenTourIds(): Promise<string[]> {
  try {
    const prefs = await preferencesService.getPreferences()
    return Object.keys(prefs?.tours_seen ?? {})
  } catch {
    return []
  }
}

/**
 * Fire-and-forget server-side seen marker. No-ops when unauthenticated and
 * swallows failures — the local mirror is already recorded by the caller.
 */
export function markTourSeenRemote(tourId: string): void {
  try {
    preferencesService.markTourSeen(tourId).catch(() => {})
  } catch {
    // ignore — local mirror already recorded
  }
}

export function readToursOptedOut(): boolean {
  try {
    return localStorage.getItem(OPTED_OUT_KEY) === 'true'
  } catch {
    return false
  }
}

export function writeToursOptedOut(optedOut: boolean): void {
  try {
    localStorage.setItem(OPTED_OUT_KEY, String(optedOut))
  } catch {
    // ignore storage failures (private mode, quota, SSR)
  }
}

/**
 * Fetches the global tour opt-out flag from the server. Returns null when
 * unauthenticated or on any failure — local state remains the source of
 * truth in that case.
 */
export async function fetchRemoteToursOptedOut(): Promise<boolean | null> {
  try {
    const prefs = await preferencesService.getPreferences()
    if (!prefs) return null
    return prefs.tours_opted_out ?? false
  } catch {
    return null
  }
}

/**
 * Fire-and-forget server-side opt-out flag. No-ops when unauthenticated and
 * swallows failures — the local mirror is already recorded by the caller.
 */
export function setToursOptedOutRemote(optedOut: boolean): void {
  try {
    preferencesService.setToursOptedOut(optedOut).catch(() => {})
  } catch {
    // ignore — local mirror already recorded
  }
}
