import { defineTour } from './helpers'

import type { TourDefinition } from '../types'

/** Tours for the battles route family. */
export const BATTLE_TOURS: TourDefinition[] = [
  defineTour('dashboard.battles', ['/battles', '/battles/browse', '/battles/arena'], [
    {},
    { target: '[data-tour="dashboard.battles.create-button"]' },
    { target: '[data-tour="dashboard.battles.feed"]', skipIfTargetMissing: true },
  ]),

  defineTour(
    'dashboard.battle-templates',
    ['/battles/templates', '/battles/templates/new', '/battles/templates/:id/edit'],
    [{}, { target: '[data-tour="dashboard.battle-templates.new-button"]' }, {}],
  ),

  defineTour('dashboard.battle-create', ['/battles/create', '/battles/new'], [
    {},
    { target: '[data-tour="dashboard.battle-create.form"]', skipIfTargetMissing: true },
  ]),

  defineTour('dashboard.battle-replay', ['/battles/:slug/replay'], [
    {},
    { target: '[data-tour="dashboard.battle-replay.viewer"]', skipIfTargetMissing: true },
  ]),

  defineTour('dashboard.battle-join', ['/battles/:slug/join'], [
    {},
    { target: '[data-tour="dashboard.battle-join.form"]', skipIfTargetMissing: true },
  ]),

  defineTour('dashboard.series', ['/series', '/series/:id', '/battles/series/:id'], [
    {},
    { target: '[data-tour="dashboard.series.list"]', skipIfTargetMissing: true },
  ]),
]
