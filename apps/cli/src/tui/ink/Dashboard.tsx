import { AppShell, type DashboardAction } from './AppShell'

import type { DashboardData } from './useDashboardData'

export type { DashboardAction }

interface DashboardProps {
  onAction: (action: DashboardAction) => void
  /** Enable raw-mode key handling. False for the non-TTY static frame. */
  interactive?: boolean
  /** Refresh interval; null disables polling. Defaults to 2000ms when interactive. */
  pollMs?: number | null
  /** Pre-fetched data for the static frame and tests (skips the network). */
  initialData?: DashboardData
}

/**
 * Thin mount point kept so ./app.tsx and ../dashboard.ts's re-mount-per-command
 * loop don't need to change — all real UI lives in AppShell (sidebar +
 * workspace + detail panel, navigation, command palette, etc).
 */
export function Dashboard(props: DashboardProps) {
  return <AppShell {...props} />
}
