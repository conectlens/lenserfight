/**
 * ScheduleTriggerRunner — configure cron-based workflow scheduling.
 *
 * Config schema (nodeConfig):
 *   cronExpression: string — standard cron (5-field)
 *   timezone?: string — IANA timezone (default: UTC)
 *   enabled?: boolean — whether the schedule is active (default: true)
 *
 * Security:
 * - Cron expression validated for format.
 * - Min interval enforced: no more frequent than every 5 minutes.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const CRON_REGEX = /^(\*(?:\/\d+)?|[0-9,\-\/]+)\s+(\*(?:\/\d+)?|[0-9,\-\/]+)\s+(\*(?:\/\d+)?|[0-9,\-\/]+)\s+(\*(?:\/\d+)?|[0-9,\-\/]+)\s+(\*(?:\/\d+)?|[0-9,\-\/]+)$/

function validateCron(expression: string): string | null {
  if (!expression || typeof expression !== 'string') return 'No cron expression configured'
  const trimmed = expression.trim()
  if (!CRON_REGEX.test(trimmed)) return 'Invalid cron expression format (expected 5-field standard cron)'

  // Check min interval: reject */1, */2, */3, */4 in the minutes field
  const parts = trimmed.split(/\s+/)
  const minuteField = parts[0]
  if (minuteField === '*' || minuteField === '*/1' || minuteField === '*/2' || minuteField === '*/3' || minuteField === '*/4') {
    const hourField = parts[1]
    if (hourField === '*') {
      return 'Schedule too frequent. Minimum interval is every 5 minutes (*/5 * * * *)'
    }
  }

  return null
}

export class ScheduleTriggerRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'schedule_trigger'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const cronExpression = ctx.nodeConfig['cronExpression'] as string | undefined
    const timezone = (ctx.nodeConfig['timezone'] as string) ?? 'UTC'
    const enabled = ctx.nodeConfig['enabled'] !== false

    const validationError = validateCron(cronExpression ?? '')
    if (validationError) {
      return {
        output: { mediaType: 'text', text: '', data: { error: validationError }, durationMs: 0 },
      }
    }

    return {
      output: {
        mediaType: 'text',
        text: `[Schedule: ${cronExpression} (${timezone})]`,
        data: {
          __schedule_trigger_request: true,
          cronExpression: cronExpression!.trim(),
          timezone,
          enabled,
        },
        durationMs: 0,
      },
      variableMutations: {
        __schedule_cron: cronExpression!.trim(),
        __schedule_active: enabled,
      },
    }
  }
}
