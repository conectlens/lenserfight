import { stripAnsi } from '@lenserfight/cli-client'
import { useEffect, useState } from 'react'

import { formatAgentWorkspaceBanner } from '../../commands/agents'
import { countPendingApprovals } from '../../lib/data-services/approvals'
import { hasResolvableAuthToken } from '../../lib/has-auth-token'
import { probeBackendHealth } from '../../lib/health-probe'
import { getActiveProfileName } from '../../utils/profiles'
import { getRecentCommands, type RecentCommandEntry } from '../command-dispatch'
import { fetchRecentLogs, type ActionLogRow } from '../dashboard'

export interface DashboardData {
  profile: string
  healthy: boolean
  logs: ActionLogRow[]
  /** Plain-text (ANSI-stripped) workspace banner, or null when no agent is selected. */
  banner: string | null
  /** Commands dispatched from the command bar this session, most-recent-first. */
  recentCommands: RecentCommandEntry[]
  pendingApprovals: number
}

const EMPTY: DashboardData = {
  profile: 'default',
  healthy: false,
  logs: [],
  banner: null,
  recentCommands: [],
  pendingApprovals: 0,
}

/**
 * Fetch the status line's async data (profile, health, action logs, agent
 * banner, recent dispatched commands, pending-approval count). The banner is
 * ANSI-stripped so ink can measure/style it cleanly. Approval count failures
 * (e.g. no auth yet) degrade to 0 rather than surfacing an error here.
 */
export async function fetchDashboardData(): Promise<DashboardData> {
  const [profile, healthy, logs, pendingApprovals] = await Promise.all([
    getActiveProfileName(),
    probeBackendHealth(),
    fetchRecentLogs(),
    hasResolvableAuthToken() ? countPendingApprovals().catch(() => 0) : Promise.resolve(0),
  ])
  const rawBanner = formatAgentWorkspaceBanner()
  return {
    profile,
    healthy,
    logs,
    banner: rawBanner ? stripAnsi(rawBanner) : null,
    recentCommands: getRecentCommands(),
    pendingApprovals,
  }
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
