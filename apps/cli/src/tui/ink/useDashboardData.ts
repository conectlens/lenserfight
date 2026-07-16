import { useEffect, useState } from 'react'
import { getActiveProfileName } from '../../utils/profiles'
import { probeBackendHealth } from '../../lib/health-probe'
import { formatAgentWorkspaceBanner } from '../../commands/agents'
import { stripAnsi } from '../../utils/ansi'
import { fetchRecentLogs, type ActionLogRow } from '../dashboard'

export interface DashboardData {
  profile: string
  healthy: boolean
  logs: ActionLogRow[]
  /** Plain-text (ANSI-stripped) workspace banner, or null when no agent is selected. */
  banner: string | null
}

const EMPTY: DashboardData = { profile: 'default', healthy: false, logs: [], banner: null }

/**
 * Fetch the dashboard's async panels (profile, health, action logs, agent
 * banner). Reuses the same probes the legacy dashboard used so behavior stays
 * identical. The banner is ANSI-stripped so ink can measure/style it cleanly.
 */
export async function fetchDashboardData(): Promise<DashboardData> {
  const [profile, healthy, logs] = await Promise.all([
    getActiveProfileName(),
    probeBackendHealth(),
    fetchRecentLogs(),
  ])
  const rawBanner = formatAgentWorkspaceBanner()
  return { profile, healthy, logs, banner: rawBanner ? stripAnsi(rawBanner) : null }
}

/**
 * React hook exposing dashboard data. When `pollMs` is set (interactive TTY),
 * it refreshes on that interval like the legacy 2s repaint. When `initial` is
 * provided and polling is disabled, it renders synchronously with no network
 * (used by the non-TTY single-frame path and by tests).
 */
export function useDashboardData(pollMs: number | null, initial?: DashboardData): DashboardData {
  const [data, setData] = useState<DashboardData>(initial ?? EMPTY)

  useEffect(() => {
    // Static path: initial data supplied and no polling — never touch the network.
    if (initial && pollMs === null) return

    let cancelled = false
    const tick = () => {
      void fetchDashboardData().then((next) => {
        if (!cancelled) setData(next)
      })
    }
    tick()
    if (pollMs === null) return () => { cancelled = true }
    const timer = setInterval(tick, pollMs)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs])

  return data
}
