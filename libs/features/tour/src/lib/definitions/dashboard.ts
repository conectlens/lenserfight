import { defineTour } from './helpers'

import type { TourDefinition } from '../types'

/**
 * Tours for the core dashboard surfaces. Ordering note: `dashboard.lensers`
 * must stay before `dashboard.profile` because the static `/lenser/requests`
 * route would otherwise be claimed by profile's `/lenser/:handle` pattern.
 */
export const DASHBOARD_TOURS: TourDefinition[] = [
  defineTour(
    'dashboard.home',
    ['/'],
    [
      {},
      { target: '[data-tour="shell.sidebar"]', placement: 'right' },
      {
        target: '[data-tour="dashboard.home.feed"]',
        placement: 'top',
        skipIfTargetMissing: true,
      },
    ],
    {
      // Mobile hides the sidebar — the navigation step is reworded as a card.
      mobile: [{}, {}, {}],
    },
  ),

  defineTour('dashboard.lenserboard', ['/lenserboard', '/leaderboard'], [
    {},
    {
      target: '[data-tour="dashboard.lenserboard.table"]',
      skipIfTargetMissing: true,
    },
    {},
  ]),

  defineTour(
    'dashboard.ai-catalog',
    ['/ai/catalog', '/ai/catalog/models', '/ai/catalog/:providerKey/:modelKey'],
    [{}, { target: '[data-tour="dashboard.ai-catalog.grid"]', skipIfTargetMissing: true }, {}],
  ),

  defineTour('dashboard.threads', ['/threads/:threadId'], [
    {},
    { target: '[data-tour="dashboard.threads.composer"]', skipIfTargetMissing: true },
  ]),

  defineTour('dashboard.lenses', ['/lenses'], [
    {},
    { target: '[data-tour="dashboard.lenses.create-button"]' },
    { target: '[data-tour="dashboard.lenses.grid"]', skipIfTargetMissing: true },
  ]),

  defineTour('dashboard.lens-lab', ['/lenses/:id/:versionRef'], [
    {},
    { target: '[data-tour="dashboard.lens-lab.editor"]' },
    {},
  ]),

  defineTour('dashboard.marketplace', ['/marketplace'], [
    {},
    { target: '[data-tour="dashboard.marketplace.grid"]', skipIfTargetMissing: true },
  ]),

  defineTour('dashboard.media', ['/media'], [
    {},
    { target: '[data-tour="dashboard.media.gallery"]', skipIfTargetMissing: true },
  ]),

  defineTour('dashboard.ray', ['/ray', '/ray/:slug', '/ray/:slug/:tab'], [
    {},
    { target: '[data-tour="dashboard.ray.cloud"]', skipIfTargetMissing: true },
  ]),

  defineTour('dashboard.chat', ['/chat'], [
    {},
    { target: '[data-tour="dashboard.chat.composer"]', skipIfTargetMissing: true },
  ]),

  defineTour('dashboard.connectors', ['/connectors'], [
    {},
    { target: '[data-tour="dashboard.connectors.add-button"]' },
    {},
  ]),

  defineTour('dashboard.automations', ['/automations'], [
    {},
    { target: '[data-tour="dashboard.automations.list"]', skipIfTargetMissing: true },
    {},
  ]),

  defineTour('dashboard.lensers', ['/lensers', '/lenser/requests'], [
    {},
    { target: '[data-tour="dashboard.lensers.grid"]', skipIfTargetMissing: true },
  ]),

  // Keep after agent.* definitions (see index.ts) and after dashboard.lensers.
  defineTour(
    'dashboard.profile',
    [
      '/lenser/:handle',
      '/lenser/:handle/:tab',
      '/lenser/:handle/followers',
      '/lenser/:handle/following',
    ],
    [
      { target: '[data-tour="dashboard.profile.header"]', skipIfTargetMissing: true },
      {},
      {},
    ],
  ),
]
