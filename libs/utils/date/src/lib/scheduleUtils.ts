/**
 * Shared battle-scheduling utilities.
 *
 * Single source of truth for datetime validation, serialization, and display
 * across the wizard (web) and CLI. The database layer enforces the same rules
 * server-side via fn_schedule_battle.
 *
 * All times are treated as local-browser time for display, serialized to UTC
 * for transport and storage (ISO 8601 / TIMESTAMPTZ).
 */

/** Minimum lead-time before "now" a schedule is considered valid (1 minute). */
const MIN_LEAD_MS = 60_000

/**
 * Returns true when the given ISO 8601 string represents a point in time at
 * least MIN_LEAD_MS in the future relative to the current system clock.
 */
export function isFutureSchedule(isoString: string): boolean {
  if (!isoString) return false
  const ts = new Date(isoString).getTime()
  return Number.isFinite(ts) && ts > Date.now() + MIN_LEAD_MS
}

/**
 * Returns the minimum selectable date as a YYYY-MM-DD string (today in local
 * time). Useful as the `min` attribute on `<input type="date">`.
 */
export function minScheduleDateLocal(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * Returns the IANA timezone name of the browser (e.g. "Europe/Istanbul").
 * Falls back to "UTC" when the Intl API is unavailable.
 */
export function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/**
 * Builds a UTC ISO 8601 string from the three local-time parts supplied by
 * the scheduling form (YYYY-MM-DD date string, numeric hour 0–23, numeric
 * minute 0–59). Returns null when any part is missing or the resulting
 * timestamp would be in the past.
 *
 * The conversion uses `new Date(localDateStr + 'T' + time)` which the runtime
 * interprets in the system/browser locale — identical to how datetime-local
 * inputs work, but with explicit hour/minute control and timezone visibility.
 */
export function serializeScheduleDateTime(
  dateStr: string,
  hour: number,
  minute: number
): string | null {
  if (!dateStr || !Number.isFinite(hour) || !Number.isFinite(minute)) return null

  const pad = (n: number) => String(n).padStart(2, '0')
  const localIso = `${dateStr}T${pad(hour)}:${pad(minute)}:00`
  const ts = new Date(localIso).getTime()

  if (!Number.isFinite(ts)) return null
  if (ts <= Date.now() + MIN_LEAD_MS) return null

  return new Date(ts).toISOString()
}

/**
 * Formats a human-readable preview of the scheduled execution time using the
 * browser's locale-aware date/time formatting, with the resolved timezone
 * appended. Used in the wizard's "Execution preview" row.
 *
 * Returns null when the combined timestamp is invalid or in the past.
 */
export function formatSchedulePreview(
  dateStr: string,
  hour: number,
  minute: number
): string | null {
  const iso = serializeScheduleDateTime(dateStr, hour, minute)
  if (!iso) return null

  const tz = localTimezone()
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: tz,
    }).format(new Date(iso))
  } catch {
    // Fallback: simple ISO truncation
    return iso.replace('T', ' ').slice(0, 16) + ' UTC'
  }
}

/**
 * Returns the set of hours (0–23) that are already in the past for the
 * selected local date. When `dateStr` is today, hours before the current
 * local hour are unavailable. When `dateStr` is a future date all hours are
 * available (empty set).
 */
export function pastHoursForDate(dateStr: string): Set<number> {
  const today = minScheduleDateLocal()
  if (dateStr !== today) return new Set()

  const now = new Date()
  const currentHour = now.getHours()
  const blocked = new Set<number>()
  for (let h = 0; h < currentHour; h++) blocked.add(h)
  return blocked
}

/**
 * Returns the set of minutes (0–59) that are already in the past for the
 * selected local date+hour combination. When the combination is the current
 * hour of today, minutes up to and including the current minute are blocked.
 */
export function pastMinutesForDateHour(dateStr: string, hour: number): Set<number> {
  const today = minScheduleDateLocal()
  const now = new Date()

  if (dateStr !== today || hour !== now.getHours()) return new Set()

  const blocked = new Set<number>()
  for (let m = 0; m <= now.getMinutes(); m++) blocked.add(m)
  return blocked
}
