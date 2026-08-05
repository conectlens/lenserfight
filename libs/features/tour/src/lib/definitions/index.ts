import { ACCOUNT_TOURS } from './account'
import { ADMIN_TOURS } from './admin'
import { AGENT_TOURS } from './agent'
import { BATTLE_TOURS } from './battles'
import { DASHBOARD_TOURS } from './dashboard'
import { WORKFLOW_TOURS } from './workflows'

import type { TourDefinition } from '../types'

/**
 * Registry of all guided tours. Keep this list ordered — the first definition
 * matching a path wins:
 * - `agent.*` before `dashboard.profile` (`/lenser/:handle/ag/<section>` vs
 *   `/lenser/:handle/:tab` — end-exact matching already separates them, but
 *   the explicit order documents intent).
 * - Inside each family, static patterns (`/workflows/templates`) come before
 *   param patterns (`/workflows/:id`) that would otherwise shadow them.
 */
export const TOURS: TourDefinition[] = [
  ...AGENT_TOURS,
  ...DASHBOARD_TOURS,
  ...BATTLE_TOURS,
  ...WORKFLOW_TOURS,
  ...ACCOUNT_TOURS,
  ...ADMIN_TOURS,
]
