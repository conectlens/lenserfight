import { render } from 'ink'

import { Dashboard, type DashboardAction } from './Dashboard'
import { fetchDashboardData } from './useDashboardData'

/**
 * Render the interactive ink dashboard for the main `lf` screen and resolve
 * once the user picks an action (run a command, or quit). The dispatch loop
 * in dashboard.ts owns what happens next — it mounts a fresh instance each
 * turn so the panels re-fetch after a dispatched command completes.
 */
export function runInkDashboard(): Promise<DashboardAction> {
  return new Promise((resolve) => {
    let action: DashboardAction = { type: 'quit' }
    const instance = render(
      <Dashboard
        onAction={(a) => {
          action = a
          instance.unmount()
        }}
      />,
      { exitOnCtrlC: false },
    )
    void instance.waitUntilExit().then(() => resolve(action))
  })
}

/**
 * Render a single static frame for non-TTY / piped output. Fetches data once,
 * paints one frame with no key handling, then unmounts. Matches the legacy
 * single-frame degrade behavior.
 */
export async function renderInkStatic(): Promise<void> {
  const data = await fetchDashboardData()
  const instance = render(
    <Dashboard interactive={false} pollMs={null} initialData={data} onAction={() => undefined} />,
    { patchConsole: false },
  )
  // Let ink flush one frame before tearing down.
  await new Promise((r) => setImmediate(r))
  instance.unmount()
  await instance.waitUntilExit()
}
