import { defineTour } from './helpers'

import type { TourDefinition } from '../types'

/**
 * Tours for the workflows route family. Ordering matters: the static
 * `/workflows/templates` and `/workflows/schedules` routes would be claimed by
 * the builder's `/workflows/:id` pattern, so they come first.
 */
export const WORKFLOW_TOURS: TourDefinition[] = [
  defineTour('dashboard.workflow-templates', ['/workflows/templates'], [
    {},
    { target: '[data-tour="dashboard.workflow-templates.gallery"]', skipIfTargetMissing: true },
  ]),

  defineTour('dashboard.workflow-schedules', ['/workflows/schedules'], [
    {},
    { target: '[data-tour="dashboard.workflow-schedules.list"]', skipIfTargetMissing: true },
  ]),

  defineTour(
    'dashboard.workflow-builder',
    [
      '/workflows/:id',
      '/workflows/:id/run/:runId',
      '/workflows/:workflowId/run/:runId/media',
      '/workflows/:id/history/executions/:execution_id',
    ],
    [
      {},
      { target: '[data-tour="dashboard.workflow-builder.canvas"]', skipIfTargetMissing: true },
      {},
    ],
  ),

  defineTour('dashboard.workflows', ['/workflows'], [
    {},
    { target: '[data-tour="dashboard.workflows.create-button"]' },
    { target: '[data-tour="dashboard.workflows.list"]', skipIfTargetMissing: true },
  ]),
]
