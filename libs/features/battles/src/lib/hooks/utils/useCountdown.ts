import { useEffect, useState } from 'react'

export interface CountdownResult {
  label: string
  /** Formatted time remaining, e.g. "2h 14m" or "45s" */
  formatted: string
  /** True when less than 1 hour remains */
  urgent: boolean
  /** True when the deadline has passed */
  expired: boolean
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '0s'
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  if (mins > 0) return `${mins}m ${secs}s`
  return `${secs}s`
}

/**
 * Returns a live countdown for the given ISO deadline.
 * Updates every second when < 1 hour remains, otherwise every minute.
 * Returns null when deadline is not provided.
 */
export function useCountdown(
  deadline: string | null | undefined,
  label = 'Closes in'
): CountdownResult | null {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!deadline) return
    const remaining = new Date(deadline).getTime() - Date.now()
    // Tick every second when urgent (<1h), else every minute
    const interval = remaining < 3_600_000 ? 1000 : 60_000
    const id = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(id)
  }, [deadline])

  if (!deadline) return null

  const deadlineMs = new Date(deadline).getTime()
  const remaining = deadlineMs - now

  if (remaining <= 0) {
    return { label, formatted: '0s', urgent: true, expired: true }
  }

  return {
    label,
    formatted: formatRemaining(remaining),
    urgent: remaining < 3_600_000,
    expired: false,
  }
}
