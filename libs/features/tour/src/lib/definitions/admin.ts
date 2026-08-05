import { defineTour } from './helpers'

import type { TourDefinition } from '../types'

/** Tours for the super-admin console. */
export const ADMIN_TOURS: TourDefinition[] = [
  defineTour(
    'dashboard.admin',
    [
      '/admin',
      '/admin/battles/moderation',
      '/admin/kill-switches',
      '/admin/kill-switch',
      '/admin/vote-anomalies',
    ],
    [
      {},
      { target: '[data-tour="dashboard.admin.cards"]', skipIfTargetMissing: true },
      {},
    ],
  ),
]
