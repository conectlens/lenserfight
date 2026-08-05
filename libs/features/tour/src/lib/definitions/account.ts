import { defineTour } from './helpers'

import type { TourDefinition } from '../types'

/** Tours for account, settings and notification surfaces. */
export const ACCOUNT_TOURS: TourDefinition[] = [
  defineTour('dashboard.settings', ['/settings/:tab', '/settings/gateway'], [
    {},
    { target: '[data-tour="dashboard.settings.tabs"]', skipIfTargetMissing: true },
  ]),

  defineTour('dashboard.account', ['/account/dashboard', '/account/devices', '/account/devices/:id'], [
    {},
    { target: '[data-tour="dashboard.account.overview"]', skipIfTargetMissing: true },
  ]),

  defineTour('dashboard.notifications', ['/notifications'], [
    {},
    { target: '[data-tour="dashboard.notifications.list"]', skipIfTargetMissing: true },
  ]),

  // Simple single-purpose page — card-only tour.
  defineTour('dashboard.waiting-list', ['/waiting-list'], [{}, {}]),
]
